// Shared contract. Source of truth: backend/src/shared. The frontend keeps an identical copy in
// frontend/src/shared; refresh it from frontend/ with `npm run sync:shared` (CI checks they match).
// Calendar days as 'YYYY-MM-DD' strings, counted in India time.
// Shared by the server (query ranges) and the dashboard (date filter).
export const TZ = 'Asia/Kolkata';
export const DEFAULT_DAYS = 8;
export const MAX_DAYS = 31;

export interface DayRange {
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;
const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

export const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toMs(value));

export const todayIst = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

export const shiftDay = (day: string, n: number): string => new Date(toMs(day) + n * DAY_MS).toISOString().slice(0, 10);

export function defaultRange(): DayRange {
  const to = todayIst();
  return { from: shiftDay(to, -(DEFAULT_DAYS - 1)), to };
}

// Orders the two ends, keeps them on or before today, and caps the span at MAX_DAYS.
export function normalizeRange(from: string, to: string): DayRange {
  const today = todayIst();
  let [start, end] = from <= to ? [from, to] : [to, from];
  if (end > today) end = today;
  if (start > end) start = end;
  const earliest = shiftDay(end, -(MAX_DAYS - 1));
  return { from: start < earliest ? earliest : start, to: end };
}

// Every day from `to` back to `from`, newest first.
export function listDays({ from, to }: DayRange): string[] {
  const days: string[] = [];
  for (let day = to; day >= from; day = shiftDay(day, -1)) days.push(day);
  return days;
}
