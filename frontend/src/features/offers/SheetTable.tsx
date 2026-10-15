import { useState, type MouseEvent } from 'react';
import type { Offer, OfferStats } from '../../shared/api';
import { PRIORITIES, PROGRESS } from '../../shared/options';
import { apiUrl } from '../../api/client';
import { CheckIcon, ClipIcon, CrossIcon, PhoneIcon } from '../../components/Icons';
import { formatCount } from '../../lib/format';
import { RAG, fileLabel, glAdminUrl, ragOf } from './offer-utils';

export interface SheetTableActions {
  setPriority(offer: Offer, value: Offer['priority']): void;
  toggleWorked(offer: Offer): void;
  toggleLms(offer: Offer): void;
  call(offer: Offer): void;
  setProgress(offer: Offer, value: Offer['progress']): void;
  saveComment(offer: Offer, text: string): void;
  openOffer(offer: Offer): void;
}

interface SheetTableProps {
  offers: Offer[];
  stats: OfferStats;
  actions: SheetTableActions;
  /** Offer whose fulfilment dialog is open. */
  pendingOfferId?: string | undefined;
  busy?: boolean;
}

const COLUMNS: readonly (readonly [string, number?])[] = [
  ['Priority', 106],
  ['Worked', 62],
  ['AOV Slab', 110],
  ['Offer ID', 138],
  ['RAG · Seller introduced', 180],
  ['Interaction via LMS', 96],
  ['Call', 108],
  ['Progress update', 224],
  ['Comment'],
];

export function SheetTable({ offers, stats, actions, pendingOfferId, busy = false }: SheetTableProps) {
  return (
    <div className="stack">
      <div className="toolbar">
        <p className="counts">
          <strong>{formatCount(stats.total)} offers</strong> · {formatCount(stats.worked)} worked ·{' '}
          {formatCount(stats.called)} called
        </p>
        <div className="legend">
          <span>RAG score</span>
          <span>
            <span className="dot rag-dot-red" />
            Red = 0
          </span>
          <span>
            <span className="dot rag-dot-amber" />
            Amber ≤ 4
          </span>
          <span>
            <span className="dot rag-dot-green" />
            Green &gt; 4
          </span>
        </div>
      </div>
      <div className="table-scroll">
        <table className={`grid${busy ? ' is-busy' : ''}`} aria-busy={busy}>
          <colgroup>
            {COLUMNS.map(([label, width]) => (
              <col key={label} style={width ? { width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(([label]) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <Row key={offer.offerId} offer={offer} actions={actions} pending={offer.offerId === pendingOfferId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ offer, actions, pending }: { offer: Offer; actions: SheetTableActions; pending: boolean }) {
  const rag = ragOf(offer.rag);
  const isRed = rag === 'red';
  const openOffer = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    actions.openOffer(offer);
  };

  return (
    <tr className={pending ? 'is-pending' : undefined}>
      <td>
        <select
          className={`field${offer.priority ? '' : ' is-empty'}`}
          aria-label={`Priority for offer ${offer.offerId}`}
          value={offer.priority}
          onChange={(e) => actions.setPriority(offer, e.target.value as Offer['priority'])}
        >
          <option value="">Select</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="check" title={offer.worked && offer.workedBy ? `Worked by ${offer.workedBy}` : undefined}>
          <input
            type="checkbox"
            checked={offer.worked}
            onChange={() => actions.toggleWorked(offer)}
            aria-label={`Worked, offer ${offer.offerId}`}
          />
        </label>
      </td>
      <td>{offer.aovSlab || <span className="muted">—</span>}</td>
      <td>
        <a className="offer-link" href={glAdminUrl(offer.offerId)} target="_blank" rel="noreferrer" onClick={openOffer}>
          {offer.offerId}
        </a>
      </td>
      <td>
        <div className="rag-cell">
          <span className={`rag rag-${rag}`}>
            <span className={`dot rag-dot-${rag}`} />
            {RAG[rag]} · {offer.rag}
          </span>
          <span className="rag-meta">
            <span>
              AST buy <b>{offer.astBuy}</b>
            </span>
            <span>
              Purchases <b>{offer.purchases}</b>
            </span>
          </span>
        </div>
      </td>
      <td>
        {isRed ? (
          <span className="muted">N/A</span>
        ) : (
          <button
            type="button"
            className={`lms ${offer.lms ? 'is-yes' : 'is-no'}`}
            aria-pressed={offer.lms}
            aria-label={`Interaction via LMS for offer ${offer.offerId}`}
            title="Click to change"
            onClick={() => actions.toggleLms(offer)}
          >
            {offer.lms ? <CheckIcon /> : <CrossIcon />}
          </button>
        )}
      </td>
      <td>
        <button
          type="button"
          className={`call${offer.callAttempted ? ' is-called' : ''}`}
          aria-label={`${offer.callAttempted ? 'Called' : 'Call'} seller for offer ${offer.offerId}`}
          onClick={() => actions.call(offer)}
        >
          <PhoneIcon />
          {offer.callAttempted ? 'Called' : 'Call'}
        </button>
      </td>
      <td>
        {isRed ? (
          <span className="muted">Not applicable for Red</span>
        ) : (
          <div className="cell-stack">
            <select
              className="field"
              aria-label={`Progress update for offer ${offer.offerId}`}
              value={pending ? 'Fulfilled' : offer.progress}
              onChange={(e) => actions.setProgress(offer, e.target.value as Offer['progress'])}
            >
              <option value="">Select status</option>
              {PROGRESS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {offer.progress === 'Fulfilled' && offer.quotation && (
              <a className="file-link" href={apiUrl(offer.quotation)} target="_blank" rel="noreferrer">
                <ClipIcon />
                <span>{fileLabel(offer.quotation)}</span>
              </a>
            )}
          </div>
        )}
      </td>
      <td>
        {/* Keyed by the saved text, so a newly saved value resets the draft. */}
        <CommentCell key={offer.comment} offer={offer} required={isRed} onSave={actions.saveComment} />
      </td>
    </tr>
  );
}

interface CommentCellProps {
  offer: Offer;
  required: boolean;
  onSave: (offer: Offer, text: string) => void;
}

function CommentCell({ offer, required, onSave }: CommentCellProps) {
  const [draft, setDraft] = useState(offer.comment);
  const missing = required && !draft.trim();
  const commit = () => {
    if (draft.trim() !== offer.comment.trim()) onSave(offer, draft.trim());
  };

  return (
    <div className="cell-stack">
      <input
        type="text"
        className={`field${missing ? ' is-invalid' : ''}`}
        value={draft}
        maxLength={2000}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder={required ? 'Required for Red' : 'Add a comment'}
        aria-label={`Comment for offer ${offer.offerId}`}
        aria-required={required}
        aria-invalid={missing}
      />
      {missing && <span className="error-text">Required when RAG is Red</span>}
    </div>
  );
}
