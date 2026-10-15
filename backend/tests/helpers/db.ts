// An in-memory Postgres (PGlite) with the tables the dashboard reads, for tests.
import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../../src/db/pool.js';

const SCHEMA = `
  CREATE TABLE fulfillment_offers (
    offer_id bigint PRIMARY KEY,
    approved_at timestamptz,
    purchases integer,
    astbuy integer,
    rag_sellers_introduced integer,
    aov_slab text,
    priority text,
    worked_flag text,
    work_emp_name text,
    call_attempted text,
    interaction_via_lms_calls text,
    progress_update text,
    progress_update_comments text,
    fulfillment_flag text,
    fulfillment_remarks text,
    quotations_invoice text,
    updated_at timestamptz
  );
  CREATE TABLE summary (
    offer_id bigint,
    approved_at timestamptz,
    approved_flag boolean,
    deletion_reason_id integer,
    purchases integer,
    astbuy_count integer
  );
  CREATE TABLE sheet_imports (id serial PRIMARY KEY, imported_at timestamptz);
`;

export interface TestDb {
  db: Db;
  pg: PGlite;
}

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  await pg.exec(SCHEMA);
  const db: Db = {
    query: <R extends Record<string, unknown>>(text: string, values?: unknown[]) => pg.query<R>(text, values),
  };
  return { db, pg };
}

export interface OfferSeed {
  offerId: number;
  approvedAt: string;
  rag?: number;
  worked?: string | null;
  called?: string | null;
  fulfilled?: string | null;
}

export async function insertOffers(pg: PGlite, offers: OfferSeed[]) {
  for (const o of offers) {
    await pg.query(
      `INSERT INTO fulfillment_offers
         (offer_id, approved_at, purchases, astbuy, rag_sellers_introduced, worked_flag, call_attempted, fulfillment_flag)
       VALUES ($1, $2, 1, 0, $3, $4, $5, $6)`,
      [o.offerId, o.approvedAt, o.rag ?? 3, o.worked ?? null, o.called ?? null, o.fulfilled ?? null],
    );
  }
}
