// The dashboard shell: header, status line and the two tabs.
import { useRef, useState } from 'react';
import { RefreshIcon } from '../components/Icons';
import { Tabs } from '../components/Tabs';
import { OffersView } from '../features/offers/OffersView';
import { useOffers } from '../features/offers/useOffers';
import { Summary } from '../features/summary/Summary';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatTime } from '../lib/format';

const VIEWS = [
  ['sheet', 'Sheet Data'],
  ['summary', 'Summary'],
] as const;
type View = (typeof VIEWS)[number][0];

export function App() {
  const [view, setView] = useState<View>('sheet');
  const [employeeName, setEmployeeName] = useLocalStorage('fcrm.empName');
  const nameRef = useRef<HTMLInputElement>(null);
  const offers = useOffers();
  const { data, loading, status } = offers;

  const statusText = status.text || (data ? 'Up to date' : loading ? 'Loading offers…' : '');
  const statusState = status.text ? status.state : 'ok';
  const meta = data
    ? [
        'Neon database',
        data.importedAt && `last import ${formatTime(data.importedAt)}`,
        `loaded ${formatTime(data.fetchedAt)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Connecting to the database…';

  return (
    <div className="page">
      <div className="shell">
        <header className="top">
          <div>
            <div className="title-row">
              <h1>Fulfillment CRM</h1>
              <span className="chip">Sheet 4</span>
            </div>
            <p className="meta">{meta}</p>
          </div>
          <div className="top-actions">
            <label className="name-field">
              <span>Your name</span>
              <input
                ref={nameRef}
                value={employeeName}
                maxLength={100}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Saved as Work_emp_name"
              />
            </label>
            <button type="button" className="btn" onClick={offers.reload} disabled={loading}>
              <RefreshIcon />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="statusbar">
          <span className="status" role="status">
            {statusText && <span className={`dot status-${statusState}`} />}
            {statusText}
          </span>
        </div>

        <div>
          <Tabs label="Dashboard views" tabs={VIEWS} active={view} onChange={setView} />
          <div className="panel" role="tabpanel">
            {view === 'summary' ? (
              <Summary />
            ) : (
              <OffersView offers={offers} employeeName={employeeName} onNameRequired={() => nameRef.current?.focus()} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
