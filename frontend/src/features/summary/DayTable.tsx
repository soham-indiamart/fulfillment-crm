import type { SummaryDay } from '../../shared/api';
import { formatCount, formatDay } from '../../lib/format';
import type { DayRow, RowKind } from './summary-rows';

// Matches .day-label-col in styles.css (narrower on phones).
const LABEL_WIDTH = 240;
const DAY_WIDTH = 104;

interface DayTableProps {
  label: string;
  firstHeader: string;
  days: readonly SummaryDay[];
  rows: readonly DayRow[];
  today: string;
  busy?: boolean;
}

/** Days as columns (newest first), one row per definition. Backs both Summary tables. */
export function DayTable({ label, firstHeader, days, rows, today, busy = false }: DayTableProps) {
  return (
    <div className="day-scroll">
      <table
        className={`day-table${busy ? ' is-busy' : ''}`}
        aria-label={label}
        aria-busy={busy}
        style={{ minWidth: LABEL_WIDTH + days.length * DAY_WIDTH }}
      >
        <colgroup>
          <col className="day-label-col" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="day-label">
              {firstHeader}
            </th>
            {days.map(({ day }) => (
              <th key={day} scope="col">
                <span className="day-date">{formatDay(day, { day: 'numeric', month: 'short' })}</span>
                <span className="day-sub">{day === today ? 'Today' : formatDay(day, { weekday: 'short' })}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`row-${row.kind}`}>
              <th scope="row" className="day-label">
                <span className={row.mono ? 'mono' : undefined}>{row.label}</span>
                {row.hint && <span className="row-hint">{row.hint}</span>}
              </th>
              {days.map((day) => {
                const cell = formatCell(row.kind, row.value(day));
                return (
                  <td key={day.day} className={cell.muted ? 'is-muted' : undefined}>
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(kind: RowKind, value: number | null): { text: string; muted?: boolean } {
  if (value === null) return { text: '–', muted: true };
  if (kind === 'pct') return { text: `${value.toFixed(1)}%` };
  return { text: formatCount(value), muted: value === 0 };
}
