import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // PGlite (in-memory Postgres) takes a moment to start in each test file.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
