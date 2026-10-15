import { formatCount } from '../lib/format';

interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}

export function Pager({ page, pageSize, total, disabled = false, onChange }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <nav className="pager" aria-label="Pages">
      <span>
        Showing {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </span>
      {pages > 1 && (
        <div className="pager-buttons">
          <button
            type="button"
            className="btn btn-sm"
            disabled={disabled || page <= 1}
            onClick={() => onChange(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={disabled || page >= pages}
            onClick={() => onChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
