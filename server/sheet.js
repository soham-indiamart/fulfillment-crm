// Sheet 4 data layer.
// Reads rows from the Google Sheet (link-shared CSV export) and keeps the
// dashboard's edits in data/local-edits.json until write access to the sheet
// (service account) is connected. Rows are identified by sheet row number (the
// sheet repeats some offer IDs); each edit also records its offer ID and is
// dropped if that row now holds a different offer. Values are stored in sheet
// format, so they can later be written to the matching cells as-is.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRIORITIES, PROGRESS } from '../shared/options.js';

const SHEET_ID = process.env.SHEET_ID || '1FuHXrJ2_nWWbfXU51UynY2kDhLrFntQT9prUQ0LTih4';
const SHEET_GID = process.env.SHEET_GID || '629504578';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'sheet-snapshot.csv');
const EDITS_FILE = path.join(DATA_DIR, 'local-edits.json');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const UPLOAD_TYPES = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx']);

// Dashboard field -> Sheet 4 column header (matched ignoring case and surrounding spaces).
const FIELDS = {
  offerId: { col: 'OFFER ID', type: 'text' },
  purchases: { col: 'Purchases', type: 'number' },
  astBuy: { col: 'Astbuy', type: 'number' },
  rag: { col: 'RAG Sellers introduced', type: 'number' },
  priority: { col: 'Priority', type: 'text', editable: true, allowed: ['', ...PRIORITIES] },
  worked: { col: 'Worked_flag', type: 'flag', editable: true },
  workedBy: { col: 'Work_emp_name', type: 'text', editable: true },
  callAttempted: { col: 'Call Attempted', type: 'flag', editable: true },
  lms: { col: 'Interaction via LMS/Calls', type: 'flag', editable: true },
  progress: { col: 'Progress Update', type: 'text', editable: true, allowed: ['', ...PROGRESS] },
  comment: { col: 'Progress Update comments', type: 'text', editable: true },
  fulfillmentFlag: { col: 'Fulfillment Flag', type: 'flag', editable: true },
  fulfillmentRemarks: { col: 'Fulfillment Remarks', type: 'text', editable: true },
  quotation: { col: 'Quotations/Invoice', type: 'text', editable: true },
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y']);

function fromSheet(type, raw) {
  const value = String(raw ?? '').trim();
  if (type === 'flag') return TRUE_VALUES.has(value.toLowerCase());
  if (type === 'number') return Number(value) || 0;
  return value;
}

function toSheet(type, value) {
  if (type === 'flag') return value ? '1' : '0';
  return String(value ?? '').trim();
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readEdits() {
  try {
    return JSON.parse(fs.readFileSync(EDITS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeEdits(edits) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${EDITS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(edits, null, 2));
  fs.renameSync(tmp, EDITS_FILE);
}

async function fetchSheetCsv() {
  try {
    const res = await fetch(CSV_URL, { signal: AbortSignal.timeout(10_000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('text/csv')) {
      throw new Error(`Google Sheets answered ${res.status} ${type || ''}`.trim() + ' — is the sheet still shared by link?');
    }
    const csv = await res.text();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SNAPSHOT_FILE, csv);
    return { csv, source: 'live', fetchedAt: new Date().toISOString() };
  } catch (err) {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      throw httpError(502, `Could not read Sheet 4 (${err.message}) and there is no offline copy yet.`);
    }
    console.warn(`Sheet 4 unreachable, using offline copy: ${err.message}`);
    return {
      csv: fs.readFileSync(SNAPSHOT_FILE, 'utf8'),
      source: 'snapshot',
      fetchedAt: fs.statSync(SNAPSHOT_FILE).mtime.toISOString(),
    };
  }
}

function columnIndexes(header) {
  const norm = (s) => s.trim().toLowerCase();
  const indexes = {};
  const missing = [];
  for (const [key, field] of Object.entries(FIELDS)) {
    indexes[key] = header.findIndex((h) => norm(h) === norm(field.col));
    if (indexes[key] === -1) missing.push(field.col);
  }
  if (missing.length) throw httpError(502, `Sheet 4 is missing columns: ${missing.join(', ')}`);
  return indexes;
}

let rowsBySheetRow = new Map();

// Saved edits for a sheet row, ignored if the row now holds another offer.
const editsFor = (edits, sheetRow, offerId) =>
  edits[sheetRow]?.offerId === offerId ? edits[sheetRow] : {};

export async function loadRows() {
  const { csv, source, fetchedAt } = await fetchSheetCsv();
  const [header = [], ...records] = parseCsv(csv);
  const indexes = columnIndexes(header);
  const edits = readEdits();
  const rows = [];
  records.forEach((record, i) => {
    const offerId = String(record[indexes.offerId] ?? '').trim();
    if (!offerId) return;
    const sheetRow = i + 2;
    const patch = editsFor(edits, sheetRow, offerId);
    const row = { sheetRow };
    for (const [key, field] of Object.entries(FIELDS)) {
      row[key] = fromSheet(field.type, key in patch ? patch[key] : record[indexes[key]]);
    }
    rows.push(row);
  });
  rowsBySheetRow = new Map(rows.map((row) => [row.sheetRow, row]));
  return { rows, source, fetchedAt, sheetUrl: SHEET_URL };
}

async function findRow(sheetRow, offerId) {
  if (!Number.isInteger(sheetRow) || sheetRow < 2) throw httpError(400, 'Invalid sheet row');
  if (!rowsBySheetRow.has(sheetRow)) await loadRows();
  const row = rowsBySheetRow.get(sheetRow);
  if (!row) throw httpError(404, `Row ${sheetRow} is not in Sheet 4`);
  if (row.offerId !== String(offerId ?? '').trim()) {
    throw httpError(409, `Row ${sheetRow} no longer holds offer ${offerId} — refresh from sheet and try again`);
  }
  return row;
}

export async function updateRow(sheetRow, offerId, patch) {
  const row = await findRow(sheetRow, offerId);
  const values = {};
  for (const [key, value] of Object.entries(patch || {})) {
    const field = FIELDS[key];
    if (!field?.editable) throw httpError(400, `${key} cannot be edited`);
    const sheetValue = toSheet(field.type, value);
    if (field.allowed && !field.allowed.includes(sheetValue)) {
      throw httpError(400, `"${sheetValue}" is not a valid ${field.col}`);
    }
    values[key] = sheetValue;
  }
  const edits = readEdits();
  edits[sheetRow] = { ...editsFor(edits, sheetRow, row.offerId), offerId: row.offerId, ...values };
  writeEdits(edits);
  for (const [key, value] of Object.entries(values)) row[key] = fromSheet(FIELDS[key].type, value);
  return row;
}

export async function fulfillRow(sheetRow, offerId, { remarks, file } = {}) {
  await findRow(sheetRow, offerId);
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
    const stored = `${offerId}-${Date.now()}-${name}`;
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, stored), bytes);
    patch.quotation = `/uploads/${stored}`;
  }
  return updateRow(sheetRow, offerId, patch);
}
