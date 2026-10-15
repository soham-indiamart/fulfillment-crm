import { DEFAULT_DAYS, defaultRange, normalizeRange, todayIst, type DayRange } from '../../shared/dates';

interface DateRangeProps {
  value: DayRange;
  onChange: (range: DayRange) => void;
}

/** "Last N days" preset (DEFAULT_DAYS) plus From/To pickers; the same day in both shows a single date. */
export function DateRange({ value, onChange }: DateRangeProps) {
  const preset = defaultRange();
  const isPreset = value.from === preset.from && value.to === preset.to;
  const pick = (from: string, to: string) => {
    if (from && to) onChange(normalizeRange(from, to));
  };

  return (
    <div className="date-range">
      <button
        type="button"
        className={`btn${isPreset ? ' is-active' : ''}`}
        aria-pressed={isPreset}
        onClick={() => onChange(preset)}
      >
        Last {DEFAULT_DAYS} days
      </button>
      <label className="date-field">
        From
        <input
          type="date"
          className="field"
          value={value.from}
          max={value.to}
          onChange={(e) => pick(e.target.value, value.to)}
        />
      </label>
      <label className="date-field">
        To
        <input
          type="date"
          className="field"
          value={value.to}
          min={value.from}
          max={todayIst()}
          onChange={(e) => pick(value.from, e.target.value)}
        />
      </label>
    </div>
  );
}
