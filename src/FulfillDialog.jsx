import { useState } from 'react';
import { formatSize } from './model.js';
import { useEscape } from './useEscape.js';
import { FileIcon, UploadIcon } from './Icons.jsx';

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx';

export default function FulfillDialog({ row, onCancel, onSubmit }) {
  const [remarks, setRemarks] = useState(row.fulfillmentRemarks || '');
  const [file, setFile] = useState(null);
  const [touched, setTouched] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEscape(onCancel, !busy);

  const missing = !remarks.trim();
  const showMissing = touched && missing;

  const pick = (picked) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      setError('File is larger than 20 MB');
      return;
    }
    setError('');
    setFile(picked);
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (missing) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ remarks: remarks.trim(), file });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay">
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="ff-title" onSubmit={submit} noValidate>
        <div>
          <h2 id="ff-title">Mark as fulfilled</h2>
          <p className="sub">
            Offer <span className="mono">{row.offerId}</span>
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="ff-remarks">
            Comment <span className="req">*</span>
          </label>
          <textarea
            id="ff-remarks"
            rows={4}
            autoFocus
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            onBlur={() => setTouched(true)}
            className={showMissing ? 'is-invalid' : undefined}
            placeholder="What was fulfilled and how"
            aria-required="true"
            aria-invalid={showMissing}
          />
          {showMissing && <span className="error-text">A comment is required to mark this offer as fulfilled.</span>}
        </div>

        <div className="form-field">
          <span className="label">
            Quotation file <span className="optional">(optional)</span>
          </span>
          {file ? (
            <div className="file-chosen">
              <FileIcon />
              <span className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatSize(file.size)}</span>
              </span>
              <button type="button" className="btn btn-sm" onClick={() => setFile(null)} disabled={busy}>
                Remove
              </button>
            </div>
          ) : (
            <label
              className={`dropzone${dragging ? ' is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0]);
              }}
            >
              <UploadIcon />
              <span>
                <span className="dz-title">
                  Choose a file <span>or drop it here</span>
                </span>
                <span className="dz-hint">PDF, image, Word or Excel · up to 20 MB</span>
              </span>
              <input type="file" accept={ACCEPT} className="visually-hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
        </div>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <p className="hint">Submitting sets Progress Update to Fulfilled and Fulfillment Flag to 1.</p>

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
