import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_DAYS, MAX_DAYS, shiftDay, todayIst } from '../src/shared/dates.js';
import { TtlCache } from '../src/lib/ttl-cache.js';
import { createSummaryRepository } from '../src/summary/repository.js';
import { createSummaryService, type SummaryService } from '../src/summary/service.js';
import { createTestDb } from './helpers/db.js';

const D0 = todayIst();
const D1 = shiftDay(D0, -1);
const D2 = shiftDay(D0, -2);
const D3 = shiftDay(D0, -3);
const ist = (day: string, time: string) => `${day}T${time}:00+05:30`;

async function seed(pg: PGlite) {
  const bls: [number, string, boolean | null, number | null, number, number][] = [
    // D1: 4 approved (2 purchased; 3 connected, one with both), 4 not approved
    [101, ist(D1, '09:00'), true, null, 2, 0],
    [102, ist(D1, '10:00'), true, null, 0, 3],
    [103, ist(D1, '11:00'), true, null, 1, 1],
    [104, ist(D1, '23:30'), true, null, 0, 0],
    [105, ist(D1, '12:00'), false, 5, 0, 0],
    [106, ist(D1, '13:00'), false, 5, 0, 0],
    [107, ist(D1, '14:00'), false, 7, 0, 0],
    [108, ist(D1, '15:00'), null, null, 0, 0],
    // 18:45 UTC on D1 is 00:15 IST on D0, so this one belongs to D0
    [109, `${D1}T18:45:00Z`, true, null, 0, 0],
    [110, ist(D0, '10:00'), true, null, 1, 0],
    // Outside the tested range, but reason 9 must still get a row
    [111, ist(D3, '12:00'), false, 9, 0, 0],
  ];
  for (const row of bls) {
    await pg.query(
      'INSERT INTO summary (offer_id, approved_at, approved_flag, deletion_reason_id, purchases, astbuy_count) VALUES ($1,$2,$3,$4,$5,$6)',
      row,
    );
  }
  const fulfilled: [number, string, string | null][] = [
    [1, ist(D1, '09:00'), '1'],
    [2, ist(D1, '09:30'), '1'],
    [3, ist(D1, '10:00'), '0'],
    [4, ist(D1, '10:30'), null],
    [5, ist(D0, '10:00'), '1'],
    [6, ist(D3, '10:00'), '1'],
  ];
  for (const row of fulfilled) {
    await pg.query('INSERT INTO fulfillment_offers (offer_id, approved_at, fulfillment_flag) VALUES ($1,$2,$3)', row);
  }
}

async function createService(timeZone: string): Promise<SummaryService> {
  const { db, pg } = await createTestDb();
  await pg.exec(`SET TIME ZONE '${timeZone}'`);
  await seed(pg);
  return createSummaryService({ repo: createSummaryRepository(db), cache: new TtlCache(0) });
}

describe.each(['UTC', 'America/New_York', 'Asia/Kolkata'])('summary (database time zone %s)', (timeZone) => {
  let summary: SummaryService;
  beforeAll(async () => {
    summary = await createService(timeZone);
  });

  it('counts each India-time day, newest first', async () => {
    const result = await summary.get({ from: D2, to: D0 });
    expect(result.from).toBe(D2);
    expect(result.to).toBe(D0);
    expect(result.reasons).toEqual(['5', '7', '9', 'none']);
    expect(result.days.map((d) => d.day)).toEqual([D0, D1, D2]);

    const [d0, d1, d2] = result.days;
    expect(d1).toEqual({
      day: D1,
      generated: 8,
      approved: 4,
      purchased: 2,
      connected: 3,
      fulfilled: 2,
      deleted: { 5: 2, 7: 1, none: 1 },
      deletedTotal: 4,
    });
    expect(d0).toEqual({
      day: D0,
      generated: 2,
      approved: 2,
      purchased: 1,
      connected: 1,
      fulfilled: 1,
      deleted: {},
      deletedTotal: 0,
    });
    expect(d2?.generated).toBe(0);
    expect(d1!.generated).toBe(d1!.approved + d1!.deletedTotal);
  });
});

describe('summary date range', () => {
  let summary: SummaryService;
  beforeAll(async () => {
    summary = await createService('UTC');
  });

  it(`defaults to the last ${DEFAULT_DAYS} days`, async () => {
    const result = await summary.get({});
    expect(result.days).toHaveLength(DEFAULT_DAYS);
    expect(result.to).toBe(D0);
  });

  it(`caps the range at ${MAX_DAYS} days, swaps reversed ends and stops at today`, async () => {
    expect((await summary.get({ from: shiftDay(D0, -60), to: D0 })).days).toHaveLength(MAX_DAYS);
    const swapped = await summary.get({ from: D0, to: D2 });
    expect([swapped.from, swapped.to]).toEqual([D2, D0]);
    expect((await summary.get({ from: D0, to: shiftDay(D0, 5) })).to).toBe(D0);
  });

  it('rejects malformed dates with a 400', async () => {
    await expect(summary.get({ from: '14-10-2026' })).rejects.toMatchObject({ status: 400 });
    await expect(summary.get({ to: "2026-10-14'; drop table summary;--" })).rejects.toMatchObject({ status: 400 });
    await expect(summary.get({ from: ['2026-10-01'] })).rejects.toMatchObject({ status: 400 });
  });
});
