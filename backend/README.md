# Fulfillment CRM — backend

The API behind the Fulfillment CRM dashboard: the offers table (paged, editable, fulfilment with quotation upload) and the day-by-day Summary, over Neon Postgres. TypeScript, Express 5, Node 24.

The dashboard is in [`../frontend`](../frontend) and is built and deployed separately.

## Getting started

```sh
nvm use                 # Node version from .nvmrc
npm ci
cp .env.example .env    # then set DATABASE_URL
npm run dev             # http://localhost:8080, restarts on changes
```

Run the frontend's `npm run dev` alongside it; Vite forwards `/api` and `/uploads` to this server.

## Scripts

| Script                            | What it does                                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                     | Runs `src/` with `tsx`, restarting on changes                    |
| `npm run build`                   | Compiles to `build/`                                             |
| `npm start`                       | Runs the build with `NODE_ENV=production`                        |
| `npm test`                        | Vitest: unit, SQL (in-memory Postgres via PGlite) and HTTP tests |
| `npm run typecheck`               | `tsc` over `src/` and `tests/`                                   |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                |
| `npm run check`                   | Everything CI runs                                               |

## Layout

```
src/
  index.ts          composition root: config → logger → pool → services → app; graceful shutdown
  app.ts            middleware (request logs, security headers, compression, CORS, rate limit), routes
  config.ts         environment parsing and validation (refuses to start on bad config)
  logger.ts         pino (structured JSON logs)
  db/pool.ts        pg pool + the Db interface repositories depend on
  http/             HttpError and the JSON error handler
  lib/              TtlCache (single-flight cache), input parsing
  storage/          FileStorage interface + LocalFileStorage (swap for S3 without touching features)
  offers/           fields (column mapping) → repository (SQL) → service (rules) → routes
  summary/          queries → repository → service (cached) → routes
  health/           /healthz (liveness), /readyz (database reachable)
  shared/           API contract shared with the frontend (see below)
tests/              HTTP, SQL and unit tests; helpers/db.ts builds an in-memory database
db/migrations/      SQL to apply to Neon (indexes)
```

Each feature follows **routes** (HTTP only) → **service** (validation and rules) → **repository** (SQL). Dependencies are created once in `src/index.ts` and passed in, so the tests build the same app around an in-memory database.

### Shared contract

`src/shared/` (API types, date rules, dropdown values) is the source of truth for both apps. The frontend keeps an identical copy and refreshes it with `npm run sync:shared`. Change the contract here first, then run `npm run sync:shared` in `../frontend` and adapt the frontend in the same commit; CI fails if the two copies differ.

## API

| Method | Path                               | Body / query                                    |
| ------ | ---------------------------------- | ----------------------------------------------- |
| GET    | `/api/offers`                      | `?page=1&pageSize=100` (max 200)                |
| PATCH  | `/api/offers/:offerId`             | `{ "changes": { "priority": "High", … } }`      |
| POST   | `/api/offers/:offerId/fulfillment` | multipart: `remarks`, optional `file` (≤ 20 MB) |
| GET    | `/api/summary`                     | `?from=YYYY-MM-DD&to=YYYY-MM-DD`                |
| GET    | `/uploads/:file`                   | stored quotation files                          |
| GET    | `/healthz`, `/readyz`              | load-balancer probes                            |

Errors are always `{ "error": "…" }`; server faults return a generic message and are logged with the request's `x-request-id`.

## Configuration

Environment variables, listed with defaults in [`.env.example`](.env.example). Only `DATABASE_URL` (Neon's **pooled** connection string) is required.

`CORS_ORIGINS` decides how the dashboard reaches the API:

- **Same origin (recommended)** — a proxy or CDN routes `/api` and `/uploads` to this service (the frontend's nginx image does this). Leave `CORS_ORIGINS` empty.
- **Separate origins** — e.g. `https://crm.example.com` calling `https://api.example.com`: set `CORS_ORIGINS=https://crm.example.com`, and build the frontend with `VITE_API_BASE_URL=https://api.example.com`.

## Deploying

```sh
docker build -t fulfillment-crm-backend .
docker run -p 8080:8080 -e DATABASE_URL=… fulfillment-crm-backend
```

Non-root image on port 8080 with a `HEALTHCHECK`; point the platform's checks at `/healthz` (liveness) and `/readyz` (readiness). It shuts down cleanly on `SIGTERM`. Host it in the same region as the database (Neon: AWS `ap-southeast-1`), e.g. AWS App Runner or ECS.

Apply the indexes once, over the direct (unpooled) connection:

```sh
psql "$DATABASE_URL_UNPOOLED" -f db/migrations/0001_dashboard_indexes.sql
```

### Scaling

- **Stateless** — run several instances behind a load balancer; set `TRUST_PROXY` to the number of proxies in front (default 1 in production).
- **Database** — each instance holds up to `DB_POOL_MAX` connections to Neon's pooler, with statement and connection timeouts.
- **Offers** are paged on the server; **Summary** results are cached per date range for `SUMMARY_CACHE_TTL_MS`, and identical concurrent requests share one query.
- **Rate limiting** is per client IP and generous by default, since offices share IPs; switch to per-user limits once sign-in exists.
- **Uploads** use the server's disk (`LocalFileStorage`). With more than one instance, or a host that wipes disks on deploy, implement `FileStorage` for S3 and pass it in `src/index.ts`.

## Data rules

### Summary

A BL's day is the India-time date of `approved_at`; the range defaults to the last 8 days (`DEFAULT_DAYS` in `src/shared/dates.ts`) and covers at most 31.

| Row                | Definition                                                                        |
| ------------------ | --------------------------------------------------------------------------------- |
| BLs generated      | all BLs that day in `summary` (approved + deleted)                                |
| BLs approved       | `approved_flag` is true                                                           |
| Approved %         | approved ÷ generated                                                              |
| Sold %             | approved BLs with `purchases > 0` ÷ approved                                      |
| Seller connected % | approved BLs with `purchases > 0` or `astbuy_count > 0` (each BL once) ÷ approved |
| Fulfilled          | offers in `fulfillment_offers` with the fulfillment flag set                      |
| Fulfillment %      | fulfilled ÷ approved                                                              |

**Deleted BLs** — BLs not flagged approved, counted per `deletion_reason_id`; every reason ID in the table gets a row.

### Offers (`fulfillment_offers`)

The field ↔ column mapping, and which fields the API accepts, live in one place: `src/offers/fields.ts`. Fulfilment (`fulfillment_flag`, `fulfillment_remarks`, `quotations_invoice`) is only set through the fulfilment endpoint.

## Not done yet

- **Sign-in** — required before the API is reachable outside a trusted network.
- **Object storage for uploads** — an S3 `FileStorage`, needed for more than one instance.
