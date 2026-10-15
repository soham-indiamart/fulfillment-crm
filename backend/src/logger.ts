import { pino, type Logger } from 'pino';
import type { Config } from './config.js';

export type { Logger };

/** Structured JSON logs (one line per event), ready for any log collector. */
export function createLogger(config: Pick<Config, 'logLevel'>): Logger {
  return pino({
    level: config.logLevel,
    base: { service: 'fulfillment-crm' },
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  });
}
