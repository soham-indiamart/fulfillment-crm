import { useEffect, useState } from 'react';
import { PRIORITIES, PROGRESS } from '../shared/options.js';
import { RAG, fileLabel, glAdminUrl, ragOf } from './model.js';
import { CheckIcon, ClipIcon, CrossIcon, PhoneIcon } from './Icons.jsx';

const COLUMNS = [
  ['Priority', 106],
  ['Worked', 62],
  ['Offer ID', 138],
  ['RAG · Seller introduced', 180],
  ['Interaction via LMS', 96],
  ['Call', 108],
  ['Progress update', 224],
  ['Comment'],
];

export default function SheetTable({ rows, actions, pendingRow }) {
  const worked = rows.filter((r) => r.worked).length;
  const called = rows.filter((r) => r.callAttempted).length;

  return (
    <div className="stack">
      <div className="toolbar">
        <p className="counts">
          <strong>{rows.length} offers</strong> · {worked} worked · {called} called
        </p>
        <div className="legend">
          <span>RAG score</span>
          <span><span className="dot rag-dot-red" />Red = 0</span>
          <span><span className="dot rag-dot-amber" />Amber ≤ 4</span>
          <span><span className="dot rag-dot-green" />Green &gt; 4</span>
        </div>
      </div>
      <div className="table-scroll">
        <table className="grid">
          <colgroup>
            {COLUMNS.map(([label, width]) => (
              <col key={label} style={width ? { width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(([label]) => (
                <th key={label} scope="col">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.offerId} row={row} actions={actions} pending={row.offerId === pendingRow} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, actions, pending }) {
  const rag = ragOf(row.rag);
  const isRed = rag === 'red';
  const openOffer = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    actions.openOffer(row);
  };

  return (
    <tr className={pending ? 'is-pending' : undefined}>
      <td>
        <select
          className={`field${row.priority ? '' : ' is-empty'}`}
          aria-label={`Priority for offer ${row.offerId}`}
          value={row.priority}
          onChange={(e) => actions.setPriority(row, e.target.value)}
        >
          <option value="">Select</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td>
        <label className="check" title={row.worked && row.workedBy ? `Worked by ${row.workedBy}` : undefined}>
          <input
            type="checkbox"
            checked={row.worked}
            onChange={() => actions.toggleWorked(row)}
            aria-label={`Worked, offer ${row.offerId}`}
          />
        </label>
      </td>
      <td>
        <a className="offer-link" href={glAdminUrl(row.offerId)} target="_blank" rel="noreferrer" onClick={openOffer}>
          {row.offerId}
        </a>
      </td>
      <td>
        <div className="rag-cell">
          <span className={`rag rag-${rag}`}>
            <span className={`dot rag-dot-${rag}`} />
            {RAG[rag]} · {row.rag}
          </span>
          <span className="rag-meta">
            <span>AST buy <b>{row.astBuy}</b></span>
            <span>Purchases <b>{row.purchases}</b></span>
          </span>
        </div>
      </td>
      <td>
        {isRed ? (
          <span className="muted">N/A</span>
        ) : (
          <button
            type="button"
            className={`lms ${row.lms ? 'is-yes' : 'is-no'}`}
            aria-pressed={row.lms}
            aria-label={`Interaction via LMS for offer ${row.offerId}`}
            title="Click to change"
            onClick={() => actions.toggleLms(row)}
          >
            {row.lms ? <CheckIcon /> : <CrossIcon />}
          </button>
        )}
      </td>
      <td>
        <button
          type="button"
          className={`call${row.callAttempted ? ' is-called' : ''}`}
          aria-label={`${row.callAttempted ? 'Called' : 'Call'} seller for offer ${row.offerId}`}
          onClick={() => actions.call(row)}
        >
          <PhoneIcon />
          {row.callAttempted ? 'Called' : 'Call'}
        </button>
      </td>
      <td>
        {isRed ? (
          <span className="muted">Not applicable for Red</span>
        ) : (
          <div className="cell-stack">
            <select
              className="field"
              aria-label={`Progress update for offer ${row.offerId}`}
              value={pending ? 'Fulfilled' : row.progress}
              onChange={(e) => actions.setProgress(row, e.target.value)}
            >
              <option value="">Select status</option>
              {PROGRESS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {row.progress === 'Fulfilled' && row.quotation && (
              <a className="file-link" href={row.quotation} target="_blank" rel="noreferrer">
                <ClipIcon />
                <span>{fileLabel(row.quotation)}</span>
              </a>
            )}
          </div>
        )}
      </td>
      <td>
        <CommentCell row={row} required={isRed} onSave={actions.saveComment} />
      </td>
    </tr>
  );
}

function CommentCell({ row, required, onSave }) {
  const [draft, setDraft] = useState(row.comment);
  useEffect(() => setDraft(row.comment), [row.comment]);
  const missing = required && !draft.trim();
  const commit = () => {
    if (draft.trim() !== row.comment.trim()) onSave(row, draft.trim());
  };

  return (
    <div className="cell-stack">
      <input
        type="text"
        className={`field${missing ? ' is-invalid' : ''}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder={required ? 'Required for Red' : 'Add a comment'}
        aria-label={`Comment for offer ${row.offerId}`}
        aria-required={required}
        aria-invalid={missing}
      />
      {missing && <span className="error-text">Required when RAG is Red</span>}
    </div>
  );
}
