// Reads and validates the environment once at startup; the rest of the server takes a Config.
import path from 'node:path';

export type Environment = 'development' | 'production' | 'test';

export interface Config {
  env: Environment;
  host: string;
  port: number;
  logLevel: string;
  /** Proxy hops in front of the app (load balancer, platform router); used for client IPs. */
  trustProxy: number;
  databaseUrl: string;
  db: {
    poolMax: number;
    connectionTimeoutMs: number;
    idleTimeoutMs: number;
    statementTimeoutMs: number;
  };
  rateLimit: { windowMs: number; max: number };
  uploads: { dir: string; maxBytes: number };
  summaryCacheTtlMs: number;
  /** Dashboard origins allowed to call the API from another domain; empty when served same-origin. */
  corsOrigins: readonly string[];
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const ENVIRONMENTS: readonly Environment[] = ['development', 'production', 'test'];
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];

  const int = (name: string, fallback: number, min = 0): number => {
    const raw = env[name];
    if (raw === undefined || raw.trim() === '') return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min) {
      problems.push(`${name} must be a whole number ≥ ${min} (got "${raw}")`);
      return fallback;
    }
    return value;
  };

  const nodeEnv = (env.NODE_ENV ?? 'development') as Environment;
  if (!ENVIRONMENTS.includes(nodeEnv)) problems.push(`NODE_ENV must be one of ${ENVIRONMENTS.join(', ')}`);
  const production = nodeEnv === 'production';

  const logLevel = env.LOG_LEVEL ?? (nodeEnv === 'test' ? 'silent' : 'info');
  if (!LOG_LEVELS.includes(logLevel)) problems.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')}`);

  const databaseUrl = env.DATABASE_URL?.trim() ?? '';
  if (!databaseUrl) problems.push('DATABASE_URL is required (the Neon pooled connection string)');

  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (!/^https?:\/\/[^/\s]+$/.test(origin)) {
      problems.push(`CORS_ORIGINS entries must look like https://dashboard.example.com (got "${origin}")`);
    }
  }

  const config: Config = {
    env: nodeEnv,
    host: env.HOST ?? '0.0.0.0',
    port: int('PORT', 8080, 1),
    logLevel,
    trustProxy: int('TRUST_PROXY', production ? 1 : 0),
    databaseUrl,
    db: {
      poolMax: int('DB_POOL_MAX', 10, 1),
      connectionTimeoutMs: int('DB_CONNECTION_TIMEOUT_MS', 5_000, 1),
      idleTimeoutMs: int('DB_IDLE_TIMEOUT_MS', 30_000, 1),
      statementTimeoutMs: int('DB_STATEMENT_TIMEOUT_MS', 10_000, 1),
    },
    rateLimit: {
      windowMs: int('RATE_LIMIT_WINDOW_MS', 60_000, 1),
      max: int('RATE_LIMIT_MAX', 3_000, 1),
    },
    uploads: {
      dir: path.resolve(env.UPLOAD_DIR ?? 'data/uploads'),
      maxBytes: int('UPLOAD_MAX_BYTES', 20 * 1024 * 1024, 1),
    },
    summaryCacheTtlMs: int('SUMMARY_CACHE_TTL_MS', 30_000),
    corsOrigins,
  };

  if (problems.length) throw new ConfigError(`Invalid configuration:\n- ${problems.join('\n- ')}`);
  return Object.freeze(config);
}
