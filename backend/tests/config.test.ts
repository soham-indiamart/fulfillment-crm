import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config.js';

const DATABASE_URL = 'postgres://user:pass@host/db';

describe('loadConfig', () => {
  it('requires DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });

  it('uses development defaults', () => {
    const config = loadConfig({ DATABASE_URL });
    expect(config).toMatchObject({ env: 'development', port: 8080, trustProxy: 0, logLevel: 'info', corsOrigins: [] });
    expect(config.db.poolMax).toBe(10);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('uses production defaults behind one proxy', () => {
    expect(loadConfig({ DATABASE_URL, NODE_ENV: 'production' })).toMatchObject({ port: 8080, trustProxy: 1 });
  });

  it('reads the CORS allowlist and rejects anything that is not an origin', () => {
    expect(
      loadConfig({ DATABASE_URL, CORS_ORIGINS: 'https://crm.indiamart.com, http://localhost:5173' }).corsOrigins,
    ).toEqual(['https://crm.indiamart.com', 'http://localhost:5173']);
    expect(() => loadConfig({ DATABASE_URL, CORS_ORIGINS: 'https://crm.indiamart.com/app' })).toThrow(/CORS_ORIGINS/);
  });

  it('reads overrides and reports every invalid value at once', () => {
    expect(loadConfig({ DATABASE_URL, PORT: '9000', DB_POOL_MAX: '25' })).toMatchObject({
      port: 9000,
      db: { poolMax: 25 },
    });
    expect(() => loadConfig({ DATABASE_URL, PORT: 'abc', DB_POOL_MAX: '0', NODE_ENV: 'staging' })).toThrow(
      /PORT[\s\S]*DB_POOL_MAX|NODE_ENV/,
    );
  });
});
