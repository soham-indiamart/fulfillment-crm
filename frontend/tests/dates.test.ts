import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAYS,
  MAX_DAYS,
  defaultRange,
  isDay,
  listDays,
  normalizeRange,
  shiftDay,
  todayIst,
} from '../src/shared/dates';

describe('dates', () => {
  const today = todayIst();

  it('recognises YYYY-MM-DD days only', () => {
    expect(isDay('2026-10-14')).toBe(true);
    expect(isDay('2026-13-01')).toBe(false);
    expect(isDay('14-10-2026')).toBe(false);
    expect(isDay(20261014)).toBe(false);
  });

  it('shifts across month and year boundaries', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it(`defaults to the last ${DEFAULT_DAYS} days including today`, () => {
    const range = defaultRange();
    expect(range.to).toBe(today);
    expect(listDays(range)).toHaveLength(DEFAULT_DAYS);
  });

  it('orders, clamps and caps ranges', () => {
    expect(normalizeRange('2026-10-10', '2026-10-01')).toEqual({ from: '2026-10-01', to: '2026-10-10' });
    expect(normalizeRange(today, shiftDay(today, 3))).toEqual({ from: today, to: today });
    expect(listDays(normalizeRange(shiftDay(today, -90), today))).toHaveLength(MAX_DAYS);
  });

  it('lists days newest first', () => {
    expect(listDays({ from: '2026-10-01', to: '2026-10-03' })).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
  });
});
