import { describe, expect, it } from 'vitest';
import type { SummaryDay } from '../src/shared/api';
import { FUNNEL_ROWS, deletedRows } from '../src/features/summary/summary-rows';

const day: SummaryDay = {
  day: '2026-10-14',
  generated: 400,
  approved: 300,
  purchased: 120,
  connected: 150,
  fulfilled: 30,
  deleted: { 5: 60, none: 40 },
  deletedTotal: 100,
};

const valueOf = (label: string) => FUNNEL_ROWS.find((row) => row.label === label)?.value(day);

describe('summary rows', () => {
  it('computes the funnel percentages from the day counts', () => {
    expect(valueOf('Approved %')).toBe(75);
    expect(valueOf('Sold %')).toBe(40);
    expect(valueOf('Seller connected %')).toBe(50);
    expect(valueOf('Fulfillment %')).toBe(10);
  });

  it('shows no percentage for a day without BLs', () => {
    const empty = { ...day, generated: 0, approved: 0 };
    expect(FUNNEL_ROWS.find((row) => row.label === 'Approved %')?.value(empty)).toBeNull();
  });

  it('lists each deletion reason, then the total', () => {
    const rows = deletedRows(['5', '7', 'none']);
    expect(rows.map((row) => row.label)).toEqual(['5', '7', 'No reason ID', 'Total BLs deleted']);
    expect(rows.map((row) => row.value(day))).toEqual([60, 0, 40, 100]);
    expect(rows.at(-1)?.kind).toBe('total');
  });
});
