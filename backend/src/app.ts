// Builds the Express app from its dependencies. No I/O happens here, so tests can build it
// around a test database and storage. API only: the dashboard is deployed separately.
import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Config } from './config.js';
import type { Db } from './db/pool.js';
import { healthRouter } from './health/routes.js';
import { apiNotFound, errorHandler } from './http/error-handler.js';
import type { Logger } from './logger.js';
import { offersRouter } from './offers/routes.js';
import type { OffersService } from './offers/service.js';
import type { FileStorage } from './storage/types.js';
import { summaryRouter } from './summary/routes.js';
import type { SummaryService } from './summary/service.js';

export interface AppDeps {
  config: Config;
  logger: Logger;
  db: Db;
  offers: OffersService;
  summary: SummaryService;
  storage: FileStorage;
}

const REQUEST_ID = /^[\w-]{1,100}$/;

export function createApp({ config, logger, db, offers, summary, storage }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => !req.url?.startsWith('/api') },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );
  // The dashboard's host sets the page's Content-Security-Policy; this server only returns JSON
  // and stored quotation files, which open in the browser's own viewers.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  app.use(healthRouter(db));

  // Needed only when the dashboard is served from another origin; same-origin setups
  // (a proxy routing /api here) leave CORS_ORIGINS empty.
  if (config.corsOrigins.length) {
    app.use(
      '/api',
      cors({
        origin: [...config.corsOrigins],
        methods: ['GET', 'PATCH', 'POST'],
        allowedHeaders: ['Content-Type', 'X-Request-Id'],
        exposedHeaders: ['X-Request-Id'],
        maxAge: 600,
      }),
    );
  }
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      limit: config.rateLimit.max,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests — please slow down' },
    }),
    express.json({ limit: '100kb' }),
  );
  app.use('/api/offers', offersRouter(offers, { maxUploadBytes: config.uploads.maxBytes }));
  app.use('/api/summary', summaryRouter(summary));
  app.use('/api', apiNotFound);

  if (storage.route) app.use(storage.route.path, storage.route.handler);

  app.use(apiNotFound);
  app.use(errorHandler);
  return app;
}
