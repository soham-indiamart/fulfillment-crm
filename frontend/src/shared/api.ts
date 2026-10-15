// Shared contract. Source of truth: backend/src/shared. The frontend keeps an identical copy in
// frontend/src/shared; refresh it from frontend/ with `npm run sync:shared` (CI checks they match).
// The HTTP API's request and response shapes, shared by the server and the dashboard.
import type { Priority, Progress } from './options.js';

/** One row of the Sheet Data table (fulfillment_offers). */
export interface Offer {
  offerId: string;
  purchases: number;
  astBuy: number;
  rag: number;
  aovSlab: string;
  priority: Priority | '';
  worked: boolean;
  workedBy: string;
  callAttempted: boolean;
  lms: boolean;
  progress: Progress | '';
  comment: string;
  fulfillmentFlag: boolean;
  fulfillmentRemarks: string;
  quotation: string;
}

/** Fields the dashboard may change with PATCH /api/offers/:offerId. Fulfilment has its own endpoint. */
export const EDITABLE_FIELDS = [
  'priority',
  'worked',
  'workedBy',
  'callAttempted',
  'lms',
  'progress',
  'comment',
  'fulfillmentFlag',
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type OfferPatch = Partial<Pick<Offer, EditableField>>;

export const OFFERS_PAGE_SIZE = { default: 100, max: 200 } as const;

/** Counts across every offer, not just the current page. */
export interface OfferStats {
  total: number;
  worked: number;
  called: number;
}

export interface OffersPage {
  items: Offer[];
  page: number;
  pageSize: number;
  stats: OfferStats;
  importedAt: string | null;
  fetchedAt: string;
}

/** One day's counts for the Summary tab. `deleted` is keyed by deletion reason ID ('none' when missing). */
export interface SummaryDay {
  day: string;
  generated: number;
  approved: number;
  purchased: number;
  connected: number;
  fulfilled: number;
  deleted: Record<string, number>;
  deletedTotal: number;
}

export interface SummaryResponse {
  from: string;
  to: string;
  reasons: string[];
  days: SummaryDay[];
}

export interface ApiErrorBody {
  error: string;
}
