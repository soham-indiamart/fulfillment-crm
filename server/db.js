// Offers data layer, backed by the fulfillment_offers table in Neon Postgres.
// The table is filled from Sheet 4 by `npm run import-sheet` in the parent
// project; the dashboard reads it and writes its edits straight back to it.
// Values are stored in sheet format (flags as '1'/'0'), matching the import.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PRIORITIES, PROGRESS } from '../shared/options.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — add it to ../.env.local (the Neon project) or .env');
}

// Long-running server: a small pool over Neon's pooled endpoint.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

const SHEET_ID = process.env.SHEET_ID || '1FuHXrJ2_nWWbfXU51UynY2kDhLrFntQT9prUQ0LTih4';
const SHEET_GID = process.env.SHEET_GID || '629504578';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const UPLOAD_TYPES = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx']);

// Dashboard field -> fulfillment_offers column.
const FIELDS = {
  offerId: { col: 'offer_id', type: 'text' },
  purchases: { col: 'purchases', type: 'number' },
  astBuy: { col: 'astbuy', type: 'number' },
  rag: { col: 'rag_sellers_introduced', type: 'number' },
  priority: { col: 'priority', type: 'text', editable: true, allowed: ['', ...PRIORITIES] },
  worked: { col: 'worked_flag', type: 'flag', editable: true },
  workedBy: { col: 'work_emp_name', type: 'text', editable: true },
  callAttempted: { col: 'call_attempted', type: 'flag', editable: true },
  lms: { col: 'interaction_via_lms_calls', type: 'flag', editable: true },
  progress: { col: 'progress_update', type: 'text', editable: true, allowed: ['', ...PROGRESS] },
  comment: { col: 'progress_update_comments', type: 'text', editable: true },
  fulfillmentFlag: { col: 'fulfillment_flag', type: 'flag', editable: true },
  fulfillmentRemarks: { col: 'fulfillment_remarks', type: 'text', editable: true },
  quotation: { col: 'quotations_invoice', type: 'text', editable: true },
};

const COLUMNS = Object.entries(FIELDS)
  .map(([key, field]) => `${field.col} AS "${key}"`)
  .join(', ');

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y']);

function fromDb(type, raw) {
  const value = String(raw ?? '').trim();
  if (type === 'flag') return TRUE_VALUES.has(value.toLowerCase());
  if (type === 'number') return Number(value) || 0;
  return value;
}

function toDb(type, value) {
  if (type === 'flag') return value ? '1' : '0';
  return String(value ?? '').trim();
}

function toRow(record) {
  const row = {};
  for (const [key, field] of Object.entries(FIELDS)) row[key] = fromDb(field.type, record[key]);
  return row;
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function parseOfferId(offerId) {
  const id = String(offerId ?? '').trim();
  if (!/^\d+$/.test(id)) throw httpError(400, 'Invalid offer ID');
  return id;
}

export async function loadRows() {
  const [{ rows }, imports] = await Promise.all([
    pool.query(`SELECT ${COLUMNS} FROM fulfillment_offers ORDER BY approved_at DESC NULLS LAST, offer_id`),
    pool.query('SELECT imported_at FROM sheet_imports ORDER BY id DESC LIMIT 1'),
  ]);
  return {
    rows: rows.map(toRow),
    importedAt: imports.rows[0]?.imported_at ?? null,
    fetchedAt: new Date().toISOString(),
    sheetUrl: SHEET_URL,
  };
}

export async function updateRow(offerId, patch) {
  const id = parseOfferId(offerId);
  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(patch || {})) {
    const field = FIELDS[key];
    if (!field?.editable) throw httpError(400, `${key} cannot be edited`);
    const dbValue = toDb(field.type, value);
    if (field.allowed && !field.allowed.includes(dbValue)) {
      throw httpError(400, `"${dbValue}" is not a valid ${field.col}`);
    }
    values.push(dbValue === '' ? null : dbValue);
    sets.push(`${field.col} = $${values.length}`);
  }
  if (!sets.length) throw httpError(400, 'Nothing to update');
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE fulfillment_offers SET ${sets.join(', ')}, updated_at = now()
     WHERE offer_id = $${values.length}
     RETURNING ${COLUMNS}`,
    values,
  );
  if (!rows[0]) throw httpError(404, `Offer ${id} is not in the database`);
  return toRow(rows[0]);
}

export async function fulfillRow(offerId, { remarks, file } = {}) {
  const id = parseOfferId(offerId);
  if (!String(remarks ?? '').trim()) throw httpError(400, 'A comment is required to mark this offer as fulfilled');
  const patch = { progress: 'Fulfilled', fulfillmentFlag: true, fulfillmentRemarks: remarks };
  if (file) {
    const name = path.basename(String(file.name || '')).replace(/[^\w.-]+/g, '_').slice(-100);
    if (!UPLOAD_TYPES.has(path.extname(name).toLowerCase())) {
      throw httpError(400, 'Upload a PDF, image, Word or Excel file');
    }
    const bytes = Buffer.from(String(file.dataBase64 || ''), 'base64');
    if (!bytes.length) throw httpError(400, 'The uploaded file is empty');
    if (bytes.length > MAX_UPLOAD_BYTES) throw httpError(413, 'File is larger than 20 MB');
    const stored = `${id}-${Date.now()}-${name}`;
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, stored), bytes);
    patch.quotation = `/uploads/${stored}`;
  }
  return updateRow(id, patch);
}
