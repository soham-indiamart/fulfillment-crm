import { describe, expect, it } from 'vitest';
import type { Offer, OffersPage } from '../src/shared/api';
import { offerIntents } from '../src/features/offers/intents';
import { fileLabel, ragOf } from '../src/features/offers/offer-utils';
import { replaceOffer } from '../src/features/offers/offers-page';

const offer = (overrides: Partial<Offer> = {}): Offer => ({
  offerId: '1',
  purchases: 0,
  astBuy: 0,
  rag: 3,
  aovSlab: '',
  priority: '',
  worked: false,
  workedBy: '',
  callAttempted: false,
  lms: false,
  progress: '',
  comment: '',
  fulfillmentFlag: false,
  fulfillmentRemarks: '',
  quotation: '',
  ...overrides,
});

describe('offer intents', () => {
  it('needs a name before marking an offer worked, but not to unmark it', () => {
    expect(offerIntents.toggleWorked(offer(), '  ')).toEqual({
      kind: 'reject',
      reason: 'Enter your name at the top before marking an offer as worked',
    });
    expect(offerIntents.toggleWorked(offer(), ' Asha ')).toEqual({
      kind: 'save',
      patch: { worked: true, workedBy: 'Asha' },
      label: 'Worked_flag → 1',
    });
    expect(offerIntents.toggleWorked(offer({ worked: true, workedBy: 'Asha' }), '')).toMatchObject({
      kind: 'save',
      patch: { worked: false, workedBy: '' },
    });
  });

  it('resets the fulfilment flag when a fulfilled offer moves to another status', () => {
    expect(offerIntents.setProgress(offer({ progress: 'Fulfilled' }), 'No seller found')).toEqual({
      kind: 'save',
      patch: { progress: 'No seller found', fulfillmentFlag: false },
      label: 'Progress Update → No seller found · Fulfillment Flag → 0',
    });
    expect(offerIntents.setProgress(offer(), '')).toMatchObject({ patch: { progress: '' } });
  });

  it('labels cleared priorities', () => {
    expect(offerIntents.setPriority('')).toMatchObject({ label: 'Priority → (cleared)' });
  });
});

describe('replaceOffer', () => {
  const page = (items: Offer[]): OffersPage => ({
    items,
    page: 1,
    pageSize: 100,
    stats: { total: 10, worked: 4, called: 2 },
    importedAt: null,
    fetchedAt: '2026-10-15T00:00:00Z',
  });

  it('swaps the offer in and keeps all-offer counts in step', () => {
    const next = replaceOffer(page([offer(), offer({ offerId: '2' })]), offer({ worked: true, callAttempted: true }));
    expect(next.items[0]).toMatchObject({ worked: true });
    expect(next.stats).toEqual({ total: 10, worked: 5, called: 3 });
  });

  it('ignores offers that are not on the page', () => {
    const before = page([offer()]);
    expect(replaceOffer(before, offer({ offerId: '9' }))).toBe(before);
  });
});

describe('offer utilities', () => {
  it('maps RAG scores to colours', () => {
    expect([0, 1, 4, 5].map(ragOf)).toEqual(['red', 'amber', 'amber', 'green']);
  });

  it('recovers the original file name from stored upload URLs', () => {
    expect(fileLabel('/uploads/123-1700000000000-abcd1234-quote%20one.pdf')).toBe('quote one.pdf');
    expect(fileLabel('/uploads/123-1700000000000-quote.pdf')).toBe('quote.pdf');
  });
});
