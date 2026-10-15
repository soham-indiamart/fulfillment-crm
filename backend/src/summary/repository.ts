import type { DayRange } from '../shared/dates.js';
import type { Db } from '../db/pool.js';
import { DELETED_BY_DAY_AND_REASON, DELETION_REASONS, FULFILLED_BY_DAY, FUNNEL_BY_DAY } from './queries.js';

export interface FunnelRow extends Record<string, unknown> {
  day: string;
  generated: number;
  approved: number;
  purchased: number;
  connected: number;
}
export interface FulfilledRow extends Record<string, unknown> {
  day: string;
  fulfilled: number;
}
export interface DeletedRow extends Record<string, unknown> {
  day: string;
  reason: number | null;
  deleted: number;
}

export interface SummaryRepository {
  funnel(range: DayRange): Promise<FunnelRow[]>;
  fulfilled(range: DayRange): Promise<FulfilledRow[]>;
  deleted(range: DayRange): Promise<DeletedRow[]>;
  reasons(): Promise<(number | null)[]>;
}

export function createSummaryRepository(db: Db): SummaryRepository {
  const dated = async <R extends Record<string, unknown>>(sql: string, { from, to }: DayRange) =>
    (await db.query<R>(sql, [from, to])).rows;

  return {
    funnel: (range) => dated<FunnelRow>(FUNNEL_BY_DAY, range),
    fulfilled: (range) => dated<FulfilledRow>(FULFILLED_BY_DAY, range),
    deleted: (range) => dated<DeletedRow>(DELETED_BY_DAY_AND_REASON, range),
    async reasons() {
      const { rows } = await db.query<{ reason: number | null }>(DELETION_REASONS);
      return rows.map((row) => row.reason);
    },
  };
}
