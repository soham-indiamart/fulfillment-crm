# Fulfillment CRM

Dashboard for the fulfillment team over the Neon Postgres database: a **Sheet Data** tab (paged, editable offers with fulfilment and quotation upload) and a **Summary** tab (day-by-day BL funnel and deletions).

Two independent apps in one repository. Each has its own dependencies, tests, Dockerfile and CI workflow, and deploys on its own.

| Folder                    | What it is                                                | Stack                      |
| ------------------------- | --------------------------------------------------------- | -------------------------- |
| [`backend/`](backend)     | JSON API: offers, summary, quotation files, health probes | Node 24, Express 5, pg     |
| [`frontend/`](frontend)   | The dashboard, built to static files                      | React 19, Vite, TypeScript |

```
fulfillment-crm/
├── backend/            src/ (config, db, http, lib, storage, offers, summary, health, shared)
│                       tests/, db/migrations/, Dockerfile
├── frontend/           src/ (app, api, components, features, hooks, lib, shared)
│                       tests/, deploy/nginx/, scripts/, Dockerfile
└── .github/workflows/  backend.yml, frontend.yml — each runs only when its folder changes
```

## Running locally

```sh
# Terminal 1 — API on http://localhost:8080
cd backend && npm ci && cp .env.example .env   # set DATABASE_URL
npm run dev

# Terminal 2 — dashboard on http://localhost:5173 (forwards /api to the backend)
cd frontend && npm ci
npm run dev
```

Both folders use the Node version in their `.nvmrc`, and `npm run check` runs everything their CI runs.

## Shared contract

The API's types, date rules and dropdown values live in `backend/src/shared/` (the source of truth), with an identical copy in `frontend/src/shared/`. After changing the backend's copy, run `npm run sync:shared` in `frontend/`. The Frontend workflow fails if the two differ.

## Deploying

Each folder is deployed on its own; point the platform at the folder (its "root directory" or Docker build context).

- **Backend** — `backend/Dockerfile`: Node image on port 8080 with `/healthz` and `/readyz`. Needs `DATABASE_URL`; host it near the database (Neon: AWS `ap-southeast-1`). See [backend/README.md](backend/README.md).
- **Frontend** — `frontend/Dockerfile`: nginx image that serves the dashboard and forwards `/api` and `/uploads` to `BACKEND_URL`, so everything is one origin. Or upload `frontend/dist` to any static host or CDN. See [frontend/README.md](frontend/README.md).

GL Admin opens inside the dashboard only when the frontend is served from an `https://*.indiamart.com` address.
