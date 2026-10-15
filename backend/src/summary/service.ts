// Summary tab: validates the day range, runs the grouped queries and shapes one entry per day.
import type { SummaryDay, SummaryResponse } from '../shared/api.js';
import { defaultRange, isDay, listDays, normalizeRange, type DayRange } from '../shared/dates.js';
import { badRequest } from '../http/errors.js';
import type { TtlCache } from '../lib/ttl-cache.js';
import type { SummaryRepository } from './repository.js';

export interface SummaryService {
  get(query: { from?: unknown; to?: unknown }): Promise<SummaryResponse>;
}

function parseRange({ from, to }: { from?: unknown; to?: unknown }): DayRange {
  for (const value of [from, to]) {
    if (value !== undefined && value !== '' && !isDay(value)) throw badRequest('Dates must be in YYYY-MM-DD format');
  }
  const fallback = defaultRange();
  return normalizeRange(isDay(from) ? from : fallback.from, isDay(to) ? to : fallback.to);
}

const reasonKey = (reason: number | null) => (reason === null ? 'none' : String(reason));
const byDay = <R extends { day: string }>(rows: R[]) => new Map(rows.map((row) => [row.day, row]));

async function buildSummary(repo: SummaryRepository, range: DayRange): Promise<SummaryResponse> {
  const [funnel, fulfilled, deleted, reasons] = await Promise.all([
    repo.funnel(range),
    repo.fulfilled(range),
    repo.deleted(range),
    repo.reasons(),
  ]);

  const funnelByDay = byDay(funnel);
  const fulfilledByDay = byDay(fulfilled);
  const deletedByDay = new Map<string, Record<string, number>>();
  for (const row of deleted) {
    const counts = deletedByDay.get(row.day) ?? {};
    counts[reasonKey(row.reason)] = row.deleted;
    deletedByDay.set(row.day, counts);
  }

  const days = listDays(range).map((day): SummaryDay => {
    const counts = funnelByDay.get(day);
    const deletedCounts = deletedByDay.get(day) ?? {};
    return {
      day,
      generated: counts?.generated ?? 0,
      approved: counts?.approved ?? 0,
      purchased: counts?.purchased ?? 0,
      connected: counts?.connected ?? 0,
      fulfilled: fulfilledByDay.get(day)?.fulfilled ?? 0,
      deleted: deletedCounts,
      deletedTotal: Object.values(deletedCounts).reduce((sum, n) => sum + n, 0),
    };
  });

  return { ...range, reasons: reasons.map(reasonKey), days };
}

/** Results are cached briefly per range, so many people opening the same view cost one set of queries. */
export function createSummaryService({
  repo,
  cache,
}: {
  repo: SummaryRepository;
  cache: TtlCache<SummaryResponse>;
}): SummaryService {
  return {
    async get(query) {
      const range = parseRange(query);
      return cache.getOrLoad(`${range.from}|${range.to}`, () => buildSummary(repo, range));
    },
  };
}
