# Fulfillment CRM — frontend

The dashboard: a **Sheet Data** tab (paged, editable offers table with fulfilment and quotation upload) and a **Summary** tab (day-by-day BL funnel and deletions). TypeScript, React 19, Vite.

The API is in [`../backend`](../backend) and is built and deployed separately.

## Getting started

```sh
nvm use                       # Node version from .nvmrc
npm ci
cp .env.example .env.local    # optional; the defaults work with a local backend
npm run dev                   # http://localhost:5173
```

Start the backend first (`npm run dev` in `../backend`, port 8080). Vite forwards `/api` and `/uploads` to `BACKEND_URL`, so the dashboard and API share one origin, as in production.

## Scripts

| Script                            | What it does                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                     | Vite dev server with live reload and the API proxy          |
| `npm run build`                   | Static production build in `dist/`                          |
| `npm run preview`                 | Serves `dist/` locally, with the same proxy                 |
| `npm test`                        | Vitest: edit rules, summary rows, date rules                |
| `npm run typecheck`               | `tsc` for the app, tests and config                         |
| `npm run lint` / `npm run format` | ESLint (incl. React hooks rules) / Prettier                 |
| `npm run sync:shared`             | Copies the API contract from `../backend` into `src/shared` |
| `npm run check`                   | Everything CI runs                                          |

## Layout

```
src/
  main.tsx              entry: ErrorBoundary + App
  app/App.tsx           shell: header, status line, tabs
  api/client.ts         typed API client (timeouts, abort, ApiError, API base URL)
  hooks/                useResource (the only data-loading hook), useLocalStorage, useEscape
  components/           Tabs, Pager, Icons, ErrorBoundary
  features/offers/      Sheet Data: useOffers, intents (pure edit rules), table, dialogs
  features/summary/     Summary: row definitions as data, DayTable, DateRange
  lib/format.ts         number and date formatting
  shared/               API contract — copy of the backend's (see below)
tests/                  unit tests for the pure modules
deploy/nginx/           nginx config used by the Docker image
scripts/                sync-shared.mjs
```

### Shared contract

`src/shared/` (API types, date rules, dropdown values) is owned by the backend (`../backend/src/shared`). Don't edit it here: change it in the backend, then run `npm run sync:shared`, which copies it from `../backend` (or pass a path: `npm run sync:shared -- <path>`). CI fails if the two copies differ.

## Deploying

The build is a static site (`dist/`). Two ways to serve it:

**1. Docker image with nginx (recommended).** Serves the dashboard and forwards `/api` and `/uploads` to the backend, so everything is one origin and the backend needs no CORS:

```sh
docker build -t fulfillment-crm-frontend .
docker run -p 8080:8080 -e BACKEND_URL=https://<backend-host> fulfillment-crm-frontend
```

It runs nginx as a non-root user on port 8080, sets the security headers (Content-Security-Policy etc.), caches hashed assets for a year, never caches `index.html`, and has a health check at `/healthz`.

**2. Any static host or CDN** (S3 + CloudFront, Netlify, …). Upload `dist/` and either:

- route `/api/*` and `/uploads/*` to the backend at the CDN (same origin, preferred), or
- build with `VITE_API_BASE_URL=https://<backend-host>` and add the dashboard's origin to the backend's `CORS_ORIGINS`.

Serve `index.html` for unknown paths, cache `assets/` for a year, and copy the security headers from `deploy/nginx/default.conf.template`.

**GL Admin:** it only allows embedding from `https://*.indiamart.com`, so the in-page window works only when the dashboard is served from such an address; anywhere else, offer IDs open GL Admin in a separate window.
