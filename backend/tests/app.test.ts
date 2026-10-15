// End-to-end over HTTP: the real Express app, services and repositories, on an in-memory database.
import { once } from 'node:events';
import fs from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Offer, OffersPage, SummaryResponse } from '../src/shared/api.js';
import { DEFAULT_DAYS } from '../src/shared/dates.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { Db } from '../src/db/pool.js';
import { TtlCache } from '../src/lib/ttl-cache.js';
import { createLogger } from '../src/logger.js';
import { createOffersRepository } from '../src/offers/repository.js';
import { createOffersService } from '../src/offers/service.js';
import { LocalFileStorage } from '../src/storage/local.js';
import { createSummaryRepository } from '../src/summary/repository.js';
import { createSummaryService } from '../src/summary/service.js';
import { createTestDb, insertOffers } from './helpers/db.js';

interface Running {
  base: string;
  close: () => Promise<void>;
}

async function start(db: Db, env: Record<string, string> = {}): Promise<Running> {
  const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'fcrm-uploads-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused',
    UPLOAD_DIR: uploads,
    UPLOAD_MAX_BYTES: '1024',
    ...env,
  });
  const storage = new LocalFileStorage(uploads);
  const app = createApp({
    config,
    logger: createLogger(config),
    db,
    storage,
    offers: createOffersService({ repo: createOffersRepository(db), storage }),
    summary: createSummaryService({ repo: createSummaryRepository(db), cache: new TtlCache<SummaryResponse>(0) }),
  });
  const server: Server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: async () => {
      server.close();
      await fs.rm(uploads, { recursive: true, force: true });
    },
  };
}

/** Parsed JSON body, typed by the caller (fetch types it as unknown). */
const readJson = async <T>(res: Response) => (await res.json()) as T;

const patch = (body: string) => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });

describe('HTTP API', () => {
  let api: Running;

  beforeAll(async () => {
    const { db, pg } = await createTestDb();
    await insertOffers(pg, [
      { offerId: 11, approvedAt: '2026-10-12T10:00:00Z' },
      { offerId: 12, approvedAt: '2026-10-13T10:00:00Z' },
      { offerId: 13, approvedAt: '2026-10-11T10:00:00Z' },
    ]);
    api = await start(db);
  });
  afterAll(() => api.close());

  it('answers health probes', async () => {
    expect(await (await fetch(`${api.base}/healthz`)).json()).toEqual({ status: 'ok' });
    expect(await (await fetch(`${api.base}/readyz`)).json()).toEqual({ status: 'ready' });
  });

  it('lists a page of offers with security and tracing headers', async () => {
    const res = await fetch(`${api.base}/api/offers?page=1&pageSize=2`, { headers: { 'x-request-id': 'req-42' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('req-42');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
    const body = await readJson<OffersPage>(res);
    expect(body.items.map((o) => o.offerId)).toEqual(['12', '11']);
    expect(body.stats.total).toBe(3);
  });

  it('edits an offer and reports validation errors as JSON', async () => {
    const ok = await fetch(`${api.base}/api/offers/11`, patch(JSON.stringify({ changes: { priority: 'High' } })));
    expect(ok.status).toBe(200);
    expect((await readJson<Offer>(ok)).priority).toBe('High');

    const bad = await fetch(`${api.base}/api/offers/11`, patch(JSON.stringify({ changes: { priority: 'Urgent' } })));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: '"Urgent" is not a valid priority' });
  });

  it('rejects malformed and oversized JSON bodies', async () => {
    expect((await fetch(`${api.base}/api/offers/11`, patch('{not json'))).status).toBe(400);
    const huge = JSON.stringify({ changes: { comment: 'x'.repeat(200_000) } });
    const res = await fetch(`${api.base}/api/offers/11`, patch(huge));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'Request body is too large' });
  });

  it('fulfils with a multipart upload and serves the stored file', async () => {
    const form = new FormData();
    form.append('remarks', 'Quote sent');
    form.append('file', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'quote.pdf');
    const res = await fetch(`${api.base}/api/offers/13/fulfillment`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
    const offer = await readJson<Offer>(res);
    expect(offer).toMatchObject({ progress: 'Fulfilled', fulfillmentFlag: true, fulfillmentRemarks: 'Quote sent' });
    expect(offer.quotation).toMatch(/^\/uploads\/13-\d+-[0-9a-f]{8}-quote\.pdf$/);

    const file = await fetch(`${api.base}${offer.quotation}`);
    expect(file.status).toBe(200);
    expect(await file.text()).toBe('%PDF-1.4 test');
  });

  it('refuses uploads over the size limit', async () => {
    const form = new FormData();
    form.append('remarks', 'Quote sent');
    form.append('file', new Blob([new Uint8Array(2048)]), 'big.pdf');
    const res = await fetch(`${api.base}/api/offers/13/fulfillment`, { method: 'POST', body: form });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'File is too large' });
  });

  it('serves the summary for the default range and validates dates', async () => {
    const res = await fetch(`${api.base}/api/summary`);
    expect(res.status).toBe(200);
    expect((await readJson<SummaryResponse>(res)).days).toHaveLength(DEFAULT_DAYS);
    expect((await fetch(`${api.base}/api/summary?from=yesterday`)).status).toBe(400);
  });

  it('answers unknown API paths with a JSON 404', async () => {
    const res = await fetch(`${api.base}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

describe('operational behaviour', () => {
  it('reports not-ready when the database is unreachable, without leaking the error', async () => {
    const failing: Db = {
      query: async () => {
        throw new Error('connection refused at 10.0.0.5');
      },
    };
    const api = await start(failing);
    try {
      expect((await fetch(`${api.base}/healthz`)).status).toBe(200);
      const ready = await fetch(`${api.base}/readyz`);
      expect(ready.status).toBe(503);
      const res = await fetch(`${api.base}/api/offers`);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Something went wrong' });
    } finally {
      await api.close();
    }
  });

  it('answers a missing stored file or unknown path with a JSON 404', async () => {
    const { db } = await createTestDb();
    const api = await start(db);
    try {
      for (const url of ['/uploads/nope.pdf', '/no-such-page']) {
        const res = await fetch(`${api.base}${url}`);
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ error: 'Not found' });
      }
    } finally {
      await api.close();
    }
  });

  it('allows only the configured dashboard origins', async () => {
    const { db } = await createTestDb();
    const api = await start(db, { CORS_ORIGINS: 'https://crm.indiamart.com' });
    try {
      const allowed = await fetch(`${api.base}/api/summary`, { headers: { Origin: 'https://crm.indiamart.com' } });
      expect(allowed.headers.get('access-control-allow-origin')).toBe('https://crm.indiamart.com');
      const other = await fetch(`${api.base}/api/summary`, { headers: { Origin: 'https://evil.example' } });
      expect(other.headers.get('access-control-allow-origin')).toBeNull();
      const preflight = await fetch(`${api.base}/api/offers/1`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://crm.indiamart.com', 'Access-Control-Request-Method': 'PATCH' },
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('access-control-allow-methods')).toContain('PATCH');
    } finally {
      await api.close();
    }
  });

  it('rate-limits each client across the API', async () => {
    const { db } = await createTestDb();
    const api = await start(db, { RATE_LIMIT_MAX: '2' });
    try {
      const statuses = [];
      for (let i = 0; i < 3; i++) statuses.push((await fetch(`${api.base}/api/summary`)).status);
      expect(statuses).toEqual([200, 200, 429]);
    } finally {
      await api.close();
    }
  });
});
