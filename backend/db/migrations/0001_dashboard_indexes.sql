-- Indexes for the dashboard's queries. Safe to run more than once; CONCURRENTLY avoids locking
-- the tables, so it must run outside a transaction. Use the direct (unpooled) connection:
--   psql "$DATABASE_URL_UNPOOLED" -f db/migrations/0001_dashboard_indexes.sql

-- Summary tab: every query filters `summary` by a range of approved_at.
CREATE INDEX CONCURRENTLY IF NOT EXISTS summary_approved_at_idx
  ON summary (approved_at);

-- Summary tab: the list of deletion reasons (BLs not approved).
CREATE INDEX CONCURRENTLY IF NOT EXISTS summary_deleted_reason_idx
  ON summary (deletion_reason_id)
  WHERE approved_flag IS NOT TRUE;

-- Sheet Data: pages are ordered by approval time, newest first; also the Fulfilled-by-day range.
CREATE INDEX CONCURRENTLY IF NOT EXISTS fulfillment_offers_approved_at_idx
  ON fulfillment_offers (approved_at DESC NULLS LAST, offer_id);

-- Edits and fulfilment look offers up by ID. Skip if offer_id is already the primary key.
CREATE INDEX CONCURRENTLY IF NOT EXISTS fulfillment_offers_offer_id_idx
  ON fulfillment_offers (offer_id);
