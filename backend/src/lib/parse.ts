import { badRequest } from '../http/errors.js';

/** A positive whole number from a query value, or `fallback` when absent; anything else is a 400. */
export function parsePositiveInt(value: unknown, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const n = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1) throw badRequest(`${name} must be a positive whole number`);
  return n;
}

/** Offer IDs are numeric strings (bigint in the database). */
export function parseOfferId(value: unknown): string {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{1,20}$/.test(id)) throw badRequest('Invalid offer ID');
  return id;
}
