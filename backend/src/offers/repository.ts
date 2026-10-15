import type { Offer, OfferStats } from '../shared/api.js';
import type { Db } from '../db/pool.js';
import { OFFER_FIELDS, SELECT_OFFER, decodeOffer, flagIsSet } from './fields.js';

/** Encoded column values keyed by offer field, as produced by encodeValue. */
export type OfferValues = Partial<Record<keyof Offer, string | null>>;

export interface OffersRepository {
  list(limit: number, offset: number): Promise<Offer[]>;
  stats(): Promise<OfferStats>;
  lastImportAt(): Promise<string | null>;
  exists(offerId: string): Promise<boolean>;
  /** Returns the updated offer, or null when no offer has that ID. */
  update(offerId: string, values: OfferValues): Promise<Offer | null>;
}

export function createOffersRepository(db: Db): OffersRepository {
  return {
    async list(limit, offset) {
      // offer_id breaks ties so pages never overlap or skip rows.
      const { rows } = await db.query(
        `SELECT ${SELECT_OFFER} FROM fulfillment_offers
         ORDER BY approved_at DESC NULLS LAST, offer_id
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return rows.map(decodeOffer);
    },

    async stats() {
      const { rows } = await db.query<{ total: number; worked: number; called: number }>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE ${flagIsSet('worked_flag')})::int AS worked,
                count(*) FILTER (WHERE ${flagIsSet('call_attempted')})::int AS called
         FROM fulfillment_offers`,
      );
      return rows[0] ?? { total: 0, worked: 0, called: 0 };
    },

    async lastImportAt() {
      const { rows } = await db.query<{ imported_at: Date | string | null }>(
        'SELECT imported_at FROM sheet_imports ORDER BY id DESC LIMIT 1',
      );
      const importedAt = rows[0]?.imported_at;
      return importedAt ? new Date(importedAt).toISOString() : null;
    },

    async exists(offerId) {
      const { rows } = await db.query('SELECT 1 FROM fulfillment_offers WHERE offer_id = $1 LIMIT 1', [offerId]);
      return rows.length > 0;
    },

    async update(offerId, values) {
      const entries = Object.entries(values) as [keyof Offer, string | null][];
      // Column names come from OFFER_FIELDS, never from the request.
      const sets = entries.map(([key], i) => `${OFFER_FIELDS[key].column} = $${i + 1}`);
      const { rows } = await db.query(
        `UPDATE fulfillment_offers SET ${sets.join(', ')}, updated_at = now()
         WHERE offer_id = $${entries.length + 1}
         RETURNING ${SELECT_OFFER}`,
        [...entries.map(([, value]) => value), offerId],
      );
      return rows[0] ? decodeOffer(rows[0]) : null;
    },
  };
}
