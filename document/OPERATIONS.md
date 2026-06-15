# HostelDrop — Operations & Deployment

Production runbook for the backend: deployment (Render), observability (Sentry +
health checks), shared-state rate limiting (Redis), and database backups
(MongoDB Atlas) with a restore drill.

---

## 1. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `APP_ENV` | yes | `production` in prod. Enables startup guardrails. |
| `MONGO_URL` | yes | MongoDB Atlas connection string (SRV). |
| `DB_NAME` | yes | Primary database name. |
| `JWT_SECRET_KEY` | yes | ≥32 chars in prod. Render generates this automatically. |
| `ADMIN_PASSWORD` | yes | Bootstrap admin password (≥8 chars). |
| `CORS_ORIGINS` | yes | Comma-separated allowed origins. |
| `TRUST_PROXY_HEADERS` | prod | `true` behind Render's proxy so client IPs (rate limiting) are correct. |
| `REDIS_URL` | recommended | Enables **shared** rate limiting across workers/instances. |
| `SENTRY_DSN` | recommended | Enables error monitoring. Leave empty to disable. |
| `SENTRY_TRACES_SAMPLE_RATE` | optional | Performance trace sampling (0.0–1.0). Default `0.0`. |
| `SMTP_EMAIL` / `SMTP_APP_PASSWORD` | optional | Gmail App Password for OTP/notification emails. |

---

## 2. Deploy to Render

The repo ships a [`render.yaml`](../render.yaml) blueprint and a
[`backend/Dockerfile`](../backend/Dockerfile).

1. On render.com → **New + → Blueprint**, connect this repository.
2. Render reads `render.yaml` and provisions the `hosteldrop-api` web service.
3. Fill the `sync: false` secrets in the dashboard (`MONGO_URL`, `DB_NAME`,
   `ADMIN_PASSWORD`, `CORS_ORIGINS`, and optionally `REDIS_URL`, `SENTRY_DSN`,
   SMTP). `JWT_SECRET_KEY` is generated automatically.
4. Deploy. Render runs the container and waits for the health check before
   routing traffic.

**Health check:** `GET /health` returns `200` with
`{"status":"ok","checks":{"database":"ok",...}}` when healthy, and `503`
(`"status":"degraded"`) if the database is unreachable. Point any external
uptime monitor (e.g. UptimeRobot, Better Uptime) at this path.

---

## 3. Rate limiting (Redis)

Auth and QR-scan limits use a sliding window. Without `REDIS_URL` the window is
kept **in process memory**, so each worker/instance limits independently and the
effective cap is multiplied by the worker count. Set `REDIS_URL` (e.g. Render
Key Value, Upstash, or any managed Redis) to enforce a single global cap. If
Redis is configured but becomes unreachable, the limiter automatically falls
back to in-memory limiting (fail-open to local limiting) rather than erroring.

QR / OTP / delegation tokens are **not** in memory — they live hashed in MongoDB
with server-side expiry and single-use atomic claims, so they already survive
restarts and scale horizontally.

---

## 4. Error monitoring (Sentry)

Set `SENTRY_DSN` to enable. The SDK auto-instruments FastAPI/Starlette.
`send_default_pii=False` so user PII is not attached to events. Set
`SENTRY_TRACES_SAMPLE_RATE` (e.g. `0.1`) to sample performance traces. With no
DSN, Sentry stays fully disabled and the app runs normally.

---

## 5. Database backups (MongoDB Atlas)

We rely on **Atlas managed backups** rather than a custom dump job.

### Policy (configure in Atlas → Cluster → Backup)
- **Cloud Backup**: enabled.
- **Snapshot schedule**: every 6–12h (or daily on free/shared tiers — note that
  M0/M2/M5 shared clusters do not support Cloud Backup; use a paid tier, or fall
  back to a scheduled `mongodump`, for real backups).
- **Retention**: daily snapshots ≥ 7 days; weekly ≥ 4 weeks.
- **PITR (Continuous Cloud Backup)**: enable on M10+ for point-in-time restore.

### Restore drill (run quarterly)
Verify backups are actually restorable — an untested backup is not a backup.

1. In Atlas → **Backup → Snapshots**, pick a recent snapshot.
2. **Restore → to a new cluster** (never overwrite production during a drill),
   e.g. `hosteldrop-restore-test`.
3. Once restored, point a staging copy of the API at it:
   `MONGO_URL=<restore-cluster-uri>` `DB_NAME=<same>` `APP_ENV=development`.
4. Smoke-test: `GET /health` → `ok`; log in as admin; list parcels; confirm
   recent records are present and counts look right.
5. Record the drill (date, snapshot used, time-to-restore, outcome) below.
6. **Delete the restore cluster** to avoid cost.

### Secret rotation
Rotate `JWT_SECRET_KEY` and SMTP credentials periodically. Rotating
`JWT_SECRET_KEY` invalidates all existing sessions (users re-login) — expected.

### Drill log
| Date | Snapshot | Time to restore | Result | By |
| --- | --- | --- | --- | --- |
| _e.g. 2026-06-16_ | _2026-06-15 02:00 UTC_ | _~12 min_ | _pass_ | _name_ |
