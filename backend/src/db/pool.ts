import pg from 'pg';
import type { Config } from '../config.js';
import type { Logger } from '../logger.js';

/** The slice of a Postgres client the repositories need; pg.Pool and test databases both fit it. */
export interface Db {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: R[] }>;
}

/**
 * One pool per server process, over Neon's pooled endpoint. Each instance holds at most
 * DB_POOL_MAX connections; Neon's pooler fans many instances into the database.
 */
export function createPool(config: Config, logger: Logger): pg.Pool {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: config.db.poolMax,
    connectionTimeoutMillis: config.db.connectionTimeoutMs,
    idleTimeoutMillis: config.db.idleTimeoutMs,
    statement_timeout: config.db.statementTimeoutMs,
    application_name: 'fulfillment-crm',
  });
  // An idle client losing its connection must not crash the process; the pool replaces it.
  pool.on('error', (err) => logger.error({ err }, 'Idle database connection failed'));
  return pool;
}
