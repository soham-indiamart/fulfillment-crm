# syntax=docker/dockerfile:1

# ---- Build: bundle the dashboard ----
FROM node:24.19.0-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Empty: same origin (this image proxies /api). Set for a separate API domain.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Runtime: static files behind nginx (non-root, port 8080) ----
FROM nginxinc/nginx-unprivileged:1.31.5-alpine AS runtime
# Where /api and /uploads are forwarded; override at deploy time.
ENV BACKEND_URL=http://backend:8080
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
