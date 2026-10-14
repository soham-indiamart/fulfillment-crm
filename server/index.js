// One server for the API and the dashboard: Vite middleware while developing,
// the built dist/ folder with --prod.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRows, updateRow, fulfillRow, UPLOAD_DIR } from './db.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROD = process.argv.includes('--prod');
const PORT = Number(process.env.PORT) || 5173;

const app = express();
app.use(express.json({ limit: '30mb' }));

const route = (handler) => (req, res, next) => handler(req, res).catch(next);

app.get('/api/rows', route(async (req, res) => res.json(await loadRows())));
app.patch(
  '/api/rows/:offerId',
  route(async (req, res) => res.json(await updateRow(req.params.offerId, req.body.changes))),
);
app.post(
  '/api/rows/:offerId/fulfill',
  route(async (req, res) => res.json(await fulfillRow(req.params.offerId, req.body))),
);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/uploads', express.static(UPLOAD_DIR));

if (PROD) {
  const dist = path.join(ROOT, 'dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status === 413 && !err.status ? 'File is too large' : err.message });
});

app.listen(PORT, () => {
  console.log(`Fulfillment CRM running at http://localhost:${PORT}${PROD ? '' : ' (dev mode)'}`);
});
