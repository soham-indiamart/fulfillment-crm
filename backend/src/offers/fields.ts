// Offer field ↔ fulfillment_offers column: the single source of truth for reads, writes and validation.
import type { Offer } from '../shared/api.js';
import { PRIORITIES, PROGRESS } from '../shared/options.js';

type FieldType = 'text' | 'number' | 'flag';

export interface FieldSpec {
  column: string;
  type: FieldType;
  /** Text values the column accepts ('' clears it). */
  allowed?: readonly string[];
  maxLength?: number;
}

export const OFFER_FIELDS: { readonly [K in keyof Offer]: FieldSpec } = {
  offerId: { column: 'offer_id', type: 'text' },
  purchases: { column: 'purchases', type: 'number' },
  astBuy: { column: 'astbuy', type: 'number' },
  rag: { column: 'rag_sellers_introduced', type: 'number' },
  aovSlab: { column: 'aov_slab', type: 'text' },
  priority: { column: 'priority', type: 'text', allowed: ['', ...PRIORITIES] },
  worked: { column: 'worked_flag', type: 'flag' },
  workedBy: { column: 'work_emp_name', type: 'text', maxLength: 100 },
  callAttempted: { column: 'call_attempted', type: 'flag' },
  lms: { column: 'interaction_via_lms_calls', type: 'flag' },
  progress: { column: 'progress_update', type: 'text', allowed: ['', ...PROGRESS] },
  comment: { column: 'progress_update_comments', type: 'text', maxLength: 2_000 },
  fulfillmentFlag: { column: 'fulfillment_flag', type: 'flag' },
  fulfillmentRemarks: { column: 'fulfillment_remarks', type: 'text', maxLength: 2_000 },
  quotation: { column: 'quotations_invoice', type: 'text', maxLength: 500 },
};

const OFFER_KEYS = Object.keys(OFFER_FIELDS) as (keyof Offer)[];

/** Flags are stored as text; these spellings read as set. */
const TRUE_VALUES = ['1', 'true', 'yes', 'y'];

/** SQL condition that matches the same rows `decodeOffer` reads as true. */
export const flagIsSet = (column: string) =>
  `lower(trim(${column})) IN (${TRUE_VALUES.map((value) => `'${value}'`).join(', ')})`;

export const SELECT_OFFER = OFFER_KEYS.map((key) => `${OFFER_FIELDS[key].column} AS "${key}"`).join(', ');

function decodeValue(type: FieldType, raw: unknown): string | number | boolean {
  const value = String(raw ?? '').trim();
  if (type === 'flag') return TRUE_VALUES.includes(value.toLowerCase());
  if (type === 'number') return Number(value) || 0;
  return value;
}

export function decodeOffer(record: Record<string, unknown>): Offer {
  const offer: Record<string, unknown> = {};
  for (const key of OFFER_KEYS) offer[key] = decodeValue(OFFER_FIELDS[key].type, record[key]);
  return offer as unknown as Offer;
}

/** A database value for one field; empty text clears the column (NULL). Flags are stored as '1'/'0'. */
export function encodeValue(spec: FieldSpec, value: unknown): string | null {
  if (spec.type === 'flag') return value ? '1' : '0';
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}
