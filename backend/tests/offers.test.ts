import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createOffersRepository } from '../src/offers/repository.js';
import { createOffersService, type OffersService } from '../src/offers/service.js';
import type { FileStorage, FileToStore } from '../src/storage/types.js';
import { createTestDb, insertOffers } from './helpers/db.js';

class MemoryStorage implements FileStorage {
  saved: { file: FileToStore; prefix: string }[] = [];
  async save(file: FileToStore, prefix: string) {
    this.saved.push({ file, prefix });
    return { url: `/uploads/${prefix}-1-abcd1234-${file.name}` };
  }
}

let pg: PGlite;
let storage: MemoryStorage;
let offers: OffersService;

beforeEach(async () => {
  const testDb = await createTestDb();
  pg = testDb.pg;
  storage = new MemoryStorage();
  offers = createOffersService({ repo: createOffersRepository(testDb.db), storage });
  await insertOffers(pg, [
    { offerId: 1, approvedAt: '2026-10-10T10:00:00Z', worked: '1', called: '1' },
    { offerId: 2, approvedAt: '2026-10-12T10:00:00Z', worked: 'true' },
    { offerId: 3, approvedAt: '2026-10-11T10:00:00Z', called: '0' },
    { offerId: 4, approvedAt: '2026-10-13T10:00:00Z', rag: 0 },
    { offerId: 5, approvedAt: '2026-10-09T10:00:00Z' },
  ]);
  await pg.query(`INSERT INTO sheet_imports (imported_at) VALUES ('2026-10-13T05:00:00Z')`);
});

describe('listing offers', () => {
  it('pages newest first with counts across every offer', async () => {
    const first = await offers.list({ page: '1', pageSize: '2' });
    expect(first.items.map((o) => o.offerId)).toEqual(['4', '2']);
    expect(first).toMatchObject({ page: 1, pageSize: 2, stats: { total: 5, worked: 2, called: 1 } });
    expect(first.importedAt).toBe('2026-10-13T05:00:00.000Z');

    const last = await offers.list({ page: '3', pageSize: '2' });
    expect(last.items.map((o) => o.offerId)).toEqual(['5']);
  });

  it('decodes rows into typed offers', async () => {
    const { items } = await offers.list({});
    expect(items.find((o) => o.offerId === '1')).toMatchObject({
      worked: true,
      callAttempted: true,
      priority: '',
      rag: 3,
      purchases: 1,
    });
  });

  it('caps the page size and rejects invalid paging', async () => {
    expect((await offers.list({ pageSize: '5000' })).pageSize).toBe(200);
    await expect(offers.list({ page: '0' })).rejects.toMatchObject({ status: 400 });
    await expect(offers.list({ page: 'two' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('updating offers', () => {
  it('saves editable fields and returns the updated offer', async () => {
    const offer = await offers.update('3', {
      priority: 'High',
      worked: true,
      workedBy: 'Asha',
      comment: ' Called twice ',
    });
    expect(offer).toMatchObject({ priority: 'High', worked: true, workedBy: 'Asha', comment: 'Called twice' });
    const { rows } = await pg.query<{ worked_flag: string }>(
      'SELECT worked_flag FROM fulfillment_offers WHERE offer_id = 3',
    );
    expect(rows[0]?.worked_flag).toBe('1');
  });

  it('clears a field with an empty value', async () => {
    await offers.update('3', { priority: 'Low' });
    expect((await offers.update('3', { priority: '' })).priority).toBe('');
  });

  it.each([
    [{ priority: 'Urgent' }, '"Urgent" is not a valid priority'],
    [{ quotation: '/x.pdf' }, 'quotation cannot be edited'],
    [{ fulfillmentRemarks: 'x' }, 'fulfillmentRemarks cannot be edited'],
    [{ worked: 'yes' }, 'worked must be true or false'],
    [{ comment: 5 }, 'comment must be text'],
    [{ comment: 'x'.repeat(2001) }, 'comment must be at most 2000 characters'],
    [{}, 'Nothing to update'],
    [null, 'Nothing to update'],
  ])('rejects %j', async (changes, message) => {
    await expect(offers.update('3', changes)).rejects.toMatchObject({ status: 400, message });
  });

  it('answers 404 for an unknown offer and 400 for a malformed ID', async () => {
    await expect(offers.update('999', { priority: 'High' })).rejects.toMatchObject({ status: 404 });
    await expect(offers.update('abc', { priority: 'High' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('fulfilling offers', () => {
  const pdf = { originalName: 'quote one.pdf', mimeType: 'application/pdf', bytes: Buffer.from('%PDF-1.4') };

  it('sets the fulfilment fields and stores the quotation', async () => {
    const offer = await offers.fulfil('2', { remarks: '  Quote sent ', file: pdf });
    expect(offer).toMatchObject({
      progress: 'Fulfilled',
      fulfillmentFlag: true,
      fulfillmentRemarks: 'Quote sent',
      quotation: '/uploads/2-1-abcd1234-quote one.pdf',
    });
    expect(storage.saved).toHaveLength(1);
    expect(storage.saved[0]).toMatchObject({ prefix: '2', file: { name: 'quote one.pdf' } });
  });

  it('works without a file', async () => {
    const offer = await offers.fulfil('2', { remarks: 'Done' });
    expect(offer.quotation).toBe('');
    expect(storage.saved).toHaveLength(0);
  });

  it('requires a comment and an allowed, non-empty file', async () => {
    await expect(offers.fulfil('2', { remarks: '  ' })).rejects.toMatchObject({ status: 400 });
    await expect(
      offers.fulfil('2', { remarks: 'x', file: { ...pdf, originalName: 'evil.html' } }),
    ).rejects.toMatchObject({ status: 400, message: 'Upload a PDF, image, Word or Excel file' });
    await expect(offers.fulfil('2', { remarks: 'x', file: { ...pdf, bytes: Buffer.alloc(0) } })).rejects.toMatchObject({
      status: 400,
    });
    expect(storage.saved).toHaveLength(0);
  });

  it('never stores a file for an unknown offer', async () => {
    await expect(offers.fulfil('999', { remarks: 'x', file: pdf })).rejects.toMatchObject({ status: 404 });
    expect(storage.saved).toHaveLength(0);
  });
});
