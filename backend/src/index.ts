// Composition root: reads config, builds every dependency once, starts the HTTP server and
// shuts down cleanly on SIGTERM/SIGINT (rolling deploys, Ctrl+C).
import type { SummaryResponse } from './shared/api.js';
import { createApp } from './app.js';
import { ConfigError, loadConfig, type Config } from './config.js';
import { createPool } from './db/pool.js';
import { TtlCache } from './lib/ttl-cache.js';
import { createLogger } from './logger.js';
import { createOffersRepository } from './offers/repository.js';
import { createOffersService } from './offers/service.js';
import { LocalFileStorage } from './storage/local.js';
import { createSummaryRepository } from './summary/repository.js';
import { createSummaryService } from './summary/service.js';

const SHUTDOWN_GRACE_MS = 10_000;

function readConfig(): Config {
  try {
    return loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}

const config = readConfig();
const logger = createLogger(config);
const pool = createPool(config, logger);
const storage = new LocalFileStorage(config.uploads.dir);

const app = createApp({
  config,
  logger,
  db: pool,
  storage,
  offers: createOffersService({ repo: createOffersRepository(pool), storage }),
  summary: createSummaryService({
    repo: createSummaryRepository(pool),
    cache: new TtlCache<SummaryResponse>(config.summaryCacheTtlMs),
  }),
});

const server = app.listen(config.port, config.host, () => {
  logger.info(
    { port: config.port, env: config.env },
    `Fulfillment CRM API listening on http://localhost:${config.port}`,
  );
});
// Outlive typical load-balancer idle timeouts (60s) so they never reuse a socket we just closed.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;
function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  setTimeout(() => {
    logger.error('Forced exit: connections did not close in time');
    process.exit(1);
  }, SHUTDOWN_GRACE_MS).unref();

  server.close(async (err) => {
    await pool.end().catch((poolErr: unknown) => logger.error({ err: poolErr }, 'Closing the database pool failed'));
    logger.info('Stopped');
    process.exit(err ? 1 : 0);
  });
  server.closeIdleConnections();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('SIGTERM');
});
