import { useState } from 'react';
import { MAX_DAYS, defaultRange, listDays, todayIst, type DayRange } from '../../shared/dates';
import { api } from '../../api/client';
import { Tabs } from '../../components/Tabs';
import { useResource } from '../../hooks/useResource';
import { formatDay } from '../../lib/format';
import { DateRange } from './DateRange';
import { DayTable } from './DayTable';
import { SUMMARY_TABLES, SUMMARY_TABS, type SummaryTableKey } from './summary-rows';

function describeRange({ from, to }: DayRange) {
  const withYear = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  if (from === to) return formatDay(to, withYear);
  return `${formatDay(from, { day: 'numeric', month: 'short' })} – ${formatDay(to, withYear)}`;
}

export function Summary() {
  const [range, setRange] = useState<DayRange>(defaultRange);
  const [tableKey, setTableKey] = useState<SummaryTableKey>('funnel');
  const { data, error, loading } = useResource(`summary:${range.from}:${range.to}`, (signal) =>
    api.getSummary(range, signal),
  );
  const table = SUMMARY_TABLES[tableKey];
  const dayCount = listDays(range).length;

  return (
    <div className="stack">
      <div className="toolbar toolbar-end">
        <div className="range-title">
          <strong>{describeRange(range)}</strong>
          <span>
            {dayCount} {dayCount === 1 ? 'day' : 'days'} · newest first · up to {MAX_DAYS} days
          </span>
        </div>
        <DateRange value={range} onChange={setRange} />
      </div>

      <div>
        <Tabs label="Summary tables" tabs={SUMMARY_TABS} active={tableKey} onChange={setTableKey} small />
        {error && !data ? (
          <div className="day-scroll is-message load-error" role="alert">
            <p>{error.message}</p>
          </div>
        ) : !data ? (
          <div className="day-scroll is-message">
            <p className="muted">Loading summary…</p>
          </div>
        ) : (
          <DayTable
            label={table.label}
            firstHeader={table.firstHeader}
            days={data.days}
            rows={table.rows(data)}
            today={todayIst()}
            busy={loading}
          />
        )}
      </div>

      <p className="hint">{error && data ? `Could not refresh: ${error.message}` : table.note}</p>
    </div>
  );
}
