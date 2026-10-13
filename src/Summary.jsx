import { PRIORITIES, PROGRESS } from '../shared/options.js';
import { RAG, ragOf } from './model.js';

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export default function Summary({ rows }) {
  const total = rows.length;
  const amberGreen = rows.filter((r) => ragOf(r.rag) !== 'red');
  const worked = rows.filter((r) => r.worked).length;
  const lmsDone = amberGreen.filter((r) => r.lms).length;
  const fulfilled = amberGreen.filter((r) => r.progress === 'Fulfilled').length;

  const ragRows = Object.entries(RAG).map(([key, label]) => {
    const count = rows.filter((r) => ragOf(r.rag) === key).length;
    return { key, label, count, share: pct(count, total) };
  });

  const priorityRows = [...PRIORITIES, ''].map((p) => {
    const group = rows.filter((r) => r.priority === p);
    const done = group.filter((r) => r.worked).length;
    return { label: p || 'Not set', total: group.length, worked: done, pending: group.length - done };
  });

  const statusRows = [...PROGRESS, ''].map((s) => ({
    label: s || 'Not updated yet',
    count: amberGreen.filter((r) => r.progress === s).length,
  }));
  const statusMax = Math.max(1, ...statusRows.map((s) => s.count));

  const attention = [
    ['Priority not set', rows.filter((r) => !r.priority).length],
    ['Red offers without a comment', rows.filter((r) => ragOf(r.rag) === 'red' && !r.comment.trim()).length],
    ['Offers not called yet', rows.filter((r) => !r.callAttempted).length],
    ['Amber + Green without a progress update', amberGreen.filter((r) => !r.progress).length],
    ['High priority not worked', rows.filter((r) => r.priority === 'High' && !r.worked).length],
  ];

  return (
    <div className="stack summary">
      <div className="tiles">
        <Tile label="Total offers" value={total} sub="In Sheet 4" />
        <Tile label="Worked" value={worked} sub={`${pct(worked, total)}% of offers`} />
        <Tile label="Interaction via LMS done" value={lmsDone} sub={`of ${amberGreen.length} Amber + Green offers`} />
        <Tile label="Fulfilled" value={fulfilled} sub={`${pct(fulfilled, amberGreen.length)}% of Amber + Green offers`} />
      </div>

      <div className="cards">
        <section className="card">
          <h2>RAG · Seller introduced</h2>
          {ragRows.map((r) => (
            <div key={r.key} className="bar-row">
              <span className="bar-label"><span className={`dot rag-dot-${r.key}`} />{r.label}</span>
              <span className="bar-track" aria-hidden="true">
                <span className={`bar-fill rag-dot-${r.key}`} style={{ width: `${r.share}%` }} />
              </span>
              <span className="bar-value">{r.count} ({r.share}%)</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Priority</h2>
          <table className="mini-table">
            <thead>
              <tr>
                <th scope="col">Priority</th>
                <th scope="col">Offers</th>
                <th scope="col">Worked</th>
                <th scope="col">Pending</th>
              </tr>
            </thead>
            <tbody>
              {priorityRows.map((p) => (
                <tr key={p.label}>
                  <th scope="row">{p.label}</th>
                  <td>{p.total}</td>
                  <td>{p.worked}</td>
                  <td>{p.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Progress update · Amber + Green</h2>
          {statusRows.map((s) => (
            <div key={s.label} className="bar-row bar-row-wide">
              <span className="bar-label">{s.label}</span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill bar-fill-neutral" style={{ width: `${pct(s.count, statusMax)}%` }} />
              </span>
              <span className="bar-value">{s.count}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Needs attention</h2>
          {attention.map(([label, count]) => (
            <div key={label} className="attention-row">
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      <span className="tile-sub">{sub}</span>
    </div>
  );
}
