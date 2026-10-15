// Typed client for the server's JSON API. Every call goes through `request`, which adds a
// timeout, honours the caller's AbortSignal and turns error responses into ApiError.
import type { ApiErrorBody, Offer, OfferPatch, OffersPage, SummaryResponse } from '../shared/api';
import type { DayRange } from '../shared/dates';

const DEFAULT_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Where the backend lives. Empty (the default) means the same origin as the dashboard, with a
 * proxy routing /api and /uploads; set VITE_API_BASE_URL at build time for a separate API domain.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** Absolute URL for an API path or a stored-file path returned by the API. */
export const apiUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`);

export class ApiError extends Error {
  override name = 'ApiError';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(url: string, { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...init }: RequestOptions = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  let res: Response;
  try {
    res = await fetch(apiUrl(url), {
      ...init,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { Accept: 'application/json', ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(0, 'The server took too long to respond');
    }
    if (isAbortError(error)) throw error;
    throw new ApiError(0, 'Could not reach the server');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, (body as ApiErrorBody | null)?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const offerPath = (offerId: string) => `/api/offers/${encodeURIComponent(offerId)}`;

export const api = {
  listOffers: ({ page, pageSize }: { page: number; pageSize: number }, signal?: AbortSignal) =>
    request<OffersPage>(`/api/offers?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`, {
      signal,
    }),

  updateOffer: (offerId: string, changes: OfferPatch) =>
    request<Offer>(offerPath(offerId), jsonBody('PATCH', { changes })),

  fulfilOffer: (offerId: string, remarks: string, file: File | null) => {
    const form = new FormData();
    form.append('remarks', remarks);
    if (file) form.append('file', file);
    return request<Offer>(`${offerPath(offerId)}/fulfillment`, {
      method: 'POST',
      body: form,
      timeoutMs: UPLOAD_TIMEOUT_MS,
    });
  },

  getSummary: ({ from, to }: DayRange, signal?: AbortSignal) =>
    request<SummaryResponse>(`/api/summary?${new URLSearchParams({ from, to })}`, { signal }),
};

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
