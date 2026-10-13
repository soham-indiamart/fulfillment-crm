import { useCallback, useEffect, useRef, useState } from 'react';
import { fulfillRow, getRows, patchRow, readFileBase64 } from './api.js';
import { canEmbedGlAdmin, formatTime, glAdminUrl } from './model.js';
import { RefreshIcon } from './Icons.jsx';
import SheetTable from './SheetTable.jsx';
import Summary from './Summary.jsx';
import FulfillDialog from './FulfillDialog.jsx';
import OfferWindow from './OfferWindow.jsx';

const NAME_KEY = 'fcrm.empName';

function readSavedName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export default function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('sheet');
  const [sync, setSync] = useState({ state: 'idle', text: '' });
  const [fulfilling, setFulfilling] = useState(null);
  const [offerWindow, setOfferWindow] = useState(null);
  const [empName, setEmpName] = useState(readSavedName);
  const nameRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getRows());
      setLoadError('');
      setSync({ state: 'idle', text: '' });
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeName = (value) => {
    setEmpName(value);
    try {
      localStorage.setItem(NAME_KEY, value);
    } catch {
      // Name is a convenience; the field still works without storage.
    }
  };

  const replaceRow = (row) =>
    setData((d) => ({ ...d, rows: d.rows.map((r) => (r.sheetRow === row.sheetRow ? row : r)) }));

  const save = async (row, patch, label) => {
    const where = `Row ${row.sheetRow} · ${label}`;
    replaceRow({ ...row, ...patch });
    setSync({ state: 'busy', text: `Saving · ${where}` });
    try {
      replaceRow(await patchRow(row, patch));
      setSync({ state: 'ok', text: `Saved · ${where}` });
    } catch (e) {
      replaceRow(row);
      setSync({ state: 'error', text: `Not saved · ${where} · ${e.message}` });
    }
  };

  const actions = {
    setPriority: (row, value) => save(row, { priority: value }, `Priority → ${value || '(cleared)'}`),
    toggleWorked: (row) => {
      const name = empName.trim();
      if (!row.worked && !name) {
        setSync({ state: 'error', text: 'Enter your name at the top before marking an offer as worked' });
        nameRef.current?.focus();
        return;
      }
      save(row, { worked: !row.worked, workedBy: row.worked ? '' : name }, `Worked_flag → ${row.worked ? 0 : 1}`);
    },
    toggleLms: (row) => save(row, { lms: !row.lms }, `Interaction via LMS → ${row.lms ? 0 : 1}`),
    call: (row) => save(row, { callAttempted: true }, 'Call Attempted → 1'),
    setProgress: (row, value) => {
      if (value === 'Fulfilled') {
        setFulfilling(row);
        return;
      }
      const patch = { progress: value };
      let label = `Progress Update → ${value || '(cleared)'}`;
      if (row.progress === 'Fulfilled') {
        patch.fulfillmentFlag = false;
        label += ' · Fulfillment Flag → 0';
      }
      save(row, patch, label);
    },
    saveComment: (row, text) => save(row, { comment: text }, 'Comment updated'),
    openOffer: (row) => {
      const url = glAdminUrl(row.offerId);
      if (canEmbedGlAdmin()) setOfferWindow({ offerId: row.offerId, url });
      else window.open(url, 'gladmin', 'popup,width=1280,height=860');
    },
  };

  const submitFulfill = async ({ remarks, file }) => {
    const row = fulfilling;
    setSync({ state: 'busy', text: `${file ? 'Uploading quotation' : 'Saving'} · Row ${row.sheetRow}` });
    const payload = { remarks };
    if (file) payload.file = { name: file.name, type: file.type, dataBase64: await readFileBase64(file) };
    try {
      replaceRow(await fulfillRow(row, payload));
    } catch (e) {
      setSync({ state: 'error', text: `Not saved · Row ${row.sheetRow} · ${e.message}` });
      throw e;
    }
    setFulfilling(null);
    setSync({
      state: 'ok',
      text: `Saved · Row ${row.sheetRow} · Progress Update → Fulfilled · Fulfillment Flag → 1${file ? ' · quotation stored' : ''}`,
    });
  };

  const closeFulfill = useCallback(() => setFulfilling(null), []);
  const closeOfferWindow = useCallback(() => setOfferWindow(null), []);

  const idleText = data?.source === 'snapshot' ? 'Google Sheets unreachable — showing the offline copy' : 'Up to date';
  const statusText = sync.text || (data ? idleText : loading ? 'Loading Sheet 4…' : '');
  const statusState = sync.text ? sync.state : data?.source === 'snapshot' ? 'busy' : 'ok';

  return (
    <div className="page">
      <div className="shell">
        <header className="top">
          <div>
            <div className="title-row">
              <h1>Fulfillment CRM</h1>
              <span className="chip">Sheet 4</span>
            </div>
            <p className="meta">
              {data ? (
                <>
                  {data.source === 'live' ? 'Live from ' : 'Offline copy of '}
                  <a href={data.sheetUrl} target="_blank" rel="noreferrer">
                    Google Sheet
                  </a>
                  {` · fetched ${formatTime(data.fetchedAt)}`}
                </>
              ) : (
                'Connecting to Google Sheet…'
              )}
            </p>
          </div>
          <div className="top-actions">
            <label className="name-field">
              <span>Your name</span>
              <input
                ref={nameRef}
                value={empName}
                onChange={(e) => changeName(e.target.value)}
                placeholder="Saved as Work_emp_name"
              />
            </label>
            <button type="button" className="btn" onClick={load} disabled={loading}>
              <RefreshIcon />
              {loading ? 'Refreshing…' : 'Refresh from sheet'}
            </button>
          </div>
        </header>

        <div className="statusbar">
          <span className="status" role="status">
            {statusText && <span className={`dot status-${statusState}`} />}
            {statusText}
          </span>
          <span className="notice">
            Edits are saved on this computer until write access to Sheet 4 is connected.
          </span>
        </div>

        <div>
          <div className="tabs" role="tablist" aria-label="Dashboard views">
            <button type="button" role="tab" className="tab" aria-selected={tab === 'sheet'} onClick={() => setTab('sheet')}>
              Sheet Data
            </button>
            <button type="button" role="tab" className="tab" aria-selected={tab === 'summary'} onClick={() => setTab('summary')}>
              Summary
            </button>
          </div>
          <div className="panel" role="tabpanel">
            {loadError ? (
              <div className="load-error" role="alert">
                <p>{loadError}</p>
                <button type="button" className="btn" onClick={load}>
                  Try again
                </button>
              </div>
            ) : !data ? (
              <p className="muted">Loading Sheet 4…</p>
            ) : tab === 'sheet' ? (
              <SheetTable rows={data.rows} actions={actions} pendingRow={fulfilling?.sheetRow} />
            ) : (
              <Summary rows={data.rows} />
            )}
          </div>
        </div>
      </div>

      {fulfilling && <FulfillDialog row={fulfilling} onCancel={closeFulfill} onSubmit={submitFulfill} />}
      {offerWindow && <OfferWindow {...offerWindow} onClose={closeOfferWindow} />}
    </div>
  );
}
