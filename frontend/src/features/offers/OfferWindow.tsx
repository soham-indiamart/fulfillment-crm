import { CrossIcon, ExternalIcon } from '../../components/Icons';
import { useEscape } from '../../hooks/useEscape';

interface OfferWindowProps {
  offerId: string;
  url: string;
  onClose: () => void;
}

/** In-page GL Admin window. Only used where GL Admin allows framing (see canEmbedGlAdmin). */
export function OfferWindow({ offerId, url, onClose }: OfferWindowProps) {
  useEscape(onClose);

  return (
    <div className="overlay">
      <div className="dialog dialog-window" role="dialog" aria-modal="true" aria-label={`GL Admin, offer ${offerId}`}>
        <div className="window-bar">
          <div className="window-title">
            <strong>GL Admin · Buylead search · Offer {offerId}</strong>
            <span className="mono small">{url}</span>
          </div>
          <a className="btn" href={url} target="_blank" rel="noreferrer">
            <ExternalIcon />
            Open in new tab
          </a>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close window" autoFocus>
            <CrossIcon />
          </button>
        </div>
        <iframe className="window-frame" title={`GL Admin, offer ${offerId}`} src={url} />
      </div>
    </div>
  );
}
