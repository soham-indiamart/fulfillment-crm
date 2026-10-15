// What the two Summary tables show, as data: DayTable renders whichever list it is given.
import type { SummaryDay, SummaryResponse } from '../../shared/api';
import { ratio } from '../../lib/format';

export type RowKind = 'count' | 'pct' | 'total';

export interface DayRow {
  label: string;
  hint?: string;
  mono?: boolean;
  kind: RowKind;
  value: (day: SummaryDay) => number | null;
}

/** BL Summary rows, top to bottom. Percentages use BLs approved, except Approved %. */
export const FUNNEL_ROWS: readonly DayRow[] = [
  { label: 'BLs generated', hint: 'Approved + deleted', kind: 'count', value: (d) => d.generated },
  { label: 'BLs approved', kind: 'count', value: (d) => d.approved },
  { label: 'Approved %', hint: 'Approved ÷ generated', kind: 'pct', value: (d) => ratio(d.approved, d.generated) },
  { label: 'Sold %', hint: 'Purchased ÷ approved', kind: 'pct', value: (d) => ratio(d.purchased, d.approved) },
  {
    label: 'Seller connected %',
    hint: '(Purchased + AST buy) ÷ approved',
    kind: 'pct',
    value: (d) => ratio(d.connected, d.approved),
  },
  { label: 'Fulfilled', hint: 'Fulfillment flag = 1', kind: 'count', value: (d) => d.fulfilled },
  { label: 'Fulfillment %', hint: 'Fulfilled ÷ approved', kind: 'pct', value: (d) => ratio(d.fulfilled, d.approved) },
];

/** One row per deletion reason ID found in the data, then the day's total. */
export const deletedRows = (reasons: readonly string[]): DayRow[] => [
  ...reasons.map((reason): DayRow => ({
    label: reason === 'none' ? 'No reason ID' : reason,
    mono: reason !== 'none',
    kind: 'count',
    value: (d) => d.deleted[reason] ?? 0,
  })),
  { label: 'Total BLs deleted', kind: 'total', value: (d) => d.deletedTotal },
];

export const SUMMARY_TABLES = {
  funnel: {
    tab: 'BL Summary',
    label: 'BL summary by date',
    firstHeader: 'Metric',
    rows: (): readonly DayRow[] => FUNNEL_ROWS,
    note: 'Approved % uses BLs generated as the base; the other percentages use BLs approved. Days follow India time.',
  },
  deleted: {
    tab: 'Deleted BLs',
    label: 'Deleted BLs by reason and date',
    firstHeader: 'Deletion reason ID',
    rows: (data: SummaryResponse): readonly DayRow[] => deletedRows(data.reasons),
    note: 'Total BLs deleted adds up every reason for that day. Days follow India time.',
  },
} as const;

export type SummaryTableKey = keyof typeof SUMMARY_TABLES;

export const SUMMARY_TABS = (Object.keys(SUMMARY_TABLES) as SummaryTableKey[]).map(
  (key) => [key, SUMMARY_TABLES[key].tab] as const,
);
