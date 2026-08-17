# LAVA — Product & Infrastructure Roadmap

*Last updated: Aug 2026*

This roadmap covers (1) **feature work** and (2) **infrastructure maturity** — taking LAVA from a
single-server app on Render + Supabase to a production-grade, cloud-hosted platform. Each phase is
sequenced so early work de-risks later work (you cannot scale what you cannot observe or back up).

---

## 1. Where we are today

| Area | Current state |
| --- | --- |
| **Frontend** | React + Vite + Tailwind SPA (PWA-ready: manifest, service worker, install prompt); Excel batch upload (exceljs) |
| **Backend** | Express + TypeScript, single process, serves both `/api/*` and the built SPA |
| **Hosting** | Render, auto-deploy from `main` (`render.yaml` blueprint) |
| **Database** | Supabase PostgreSQL via **PostgREST with the anon key** — **no RLS**; authorization enforced in Express |
| **Auth** | Self-issued JWT (7-day), bcrypt passwords; `JWT_SECRET` currently **ephemeral if unset** |
| **AI** | Anthropic Claude (`claude-sonnet-4-6`), key stored in a `settings` table row |
| **File storage** | None persisted — chat attachments are ephemeral (in-memory) |
| **Observability** | None (no structured logs, metrics, or error tracking) |
| **Tests** | Manual smoke tests only |
| **Backups** | Supabase free-tier auto-backups only (limited retention) |

### Main risks today
1. **Database access pattern** — the Supabase **anon key is embedded client-side/SSR-injected**, and
   PostgREST is callable directly with it. Today nothing malicious uses it, but there is no RLS to
   stop a leaked key from reading/writing tables. This is the single biggest security item.
2. **Secrets** — `JWT_SECRET` and `CLAUDE_API_KEY` are only production-safe if set in Render env;
   the Claude key also lives in a DB row. Keys should move to a secret manager and be rotated.
3. **List endpoints cap at 1,000 rows** (PostgREST default) — Overview/Verify lists can disagree
   with the real counts until pagination is fixed.
4. **No automated tests or CI** — changes ship on manual verification.
5. **No monitoring** — if prod breaks, we find out from a user, not an alert.

---

## 2. Phase 1 — Production hardening (weeks 1–4)

> Goal: make the *current* architecture safe, observable, and testable before moving it.

### Security
- [ ] **Fix the DB access pattern.** Enable **Row Level Security** on Supabase and use the
      **`service_role` key server-side only** (never in the browser), or replace direct PostgREST
      calls with a server-only DB client. Express already enforces authz — RLS becomes defense-in-depth.
- [ ] Set a **real `JWT_SECRET`** in production env; add **secret rotation** runbook.
- [ ] Move the **Claude API key out of the `settings` table** into env + secret manager; keep the DB
      row only as an override for non-secret settings.
- [ ] Input validation on all routes (**zod** schemas) — don't trust `req.body`.
- [ ] Rate limiting per endpoint/user (extend existing `express-rate-limit`), and lock down CORS to
      the real domain.

### Reliability & observability
- [ ] **Structured logging** (pino) + request IDs; log to stdout (collected in Phase 2).
- [ ] **Error tracking** — Sentry (frontend + backend) with source maps.
- [ ] **Health/readiness endpoints** and uptime checks (UptimeRobot / BetterStack).
- [ ] **Automated backups** for the DB with restore drills (upgrade Supabase tier or add dumps).

### Quality
- [ ] **CI with GitHub Actions**: `lint → typecheck → build → backend unit/integration tests →
      frontend component tests → e2e (Playwright)` on every PR.
- [ ] **Test suite**: backend (auth, submissions, audit, roles), frontend (critical flows:
      sign-in, submit, verify, delete).
- [ ] **Fix the 1,000-row pagination cap** on list endpoints (server-side pagination + count).

---

## 3. Phase 2 — Cloud infrastructure & managed services (months 2–3)

> Goal: move to production-grade hosting, a managed relational DB, and object storage.

### 3.1 Hosting target

| Workload | Recommended | Alternatives |
| --- | --- | --- |
| **Backend API** | **AWS ECS Fargate** (Docker, autoscaling) or **Render Pro** | Fly.io, Railway, DigitalOcean App Platform |
| **Frontend static build** | **S3 + CloudFront CDN** (fast, cheap, immutable deploys) | Vercel, Netlify |
| **PostgreSQL** | **Supabase Pro** (managed, backups, pooler) or **AWS RDS multi-AZ** | Neon, PlanetScale-compatible (MySQL) |

- [ ] **Containerize** the backend (Dockerfile exists — make it deployable to ECS/Fargate).
- [ ] **Split frontend from backend** so the SPA is served from CDN and the API is a separate service.
- [ ] **Custom domain + TLS** (Route 53 + ACM certs), `APP_ORIGINS` locked to the real origin.
- [ ] **Secrets manager** — AWS Secrets Manager / SSM Parameter Store (or Render secret env).
- [ ] **Connection pooling** (Supabase Pooler or PgBouncer) so many instances don't exhaust connections.

### 3.2 Production-grade database
- [ ] Choose: **Supabase Pro** (least migration — same project, daily backups, PITR, RLS) **or RDS**.
- [ ] Enable **encryption at rest**, automated backups, and **point-in-time recovery**.
- [ ] Add **DB migrations** (a proper `migrations/` runner) instead of one-off SQL scripts.
- [ ] Add **read replicas / caching later** only when query load justifies it (see Phase 3).

### 3.3 Object storage (new capability)
Currently the app cannot store files. Add **S3 (or Cloudflare R2 / Supabase Storage)** for:
- [ ] **Uploaded documents** — floor plan sketches, PDFs, valuation documents attached to submissions.
- [ ] **Knowledge-base files** — store originals; index text for the AI.
- [ ] **Generated exports** — AI responses, valuation reports, CSVs.
- [ ] Access model: **private bucket + presigned URLs** (backend signs short-lived URLs; uploads use
      presigned PUTs so keys never reach the browser).

### 3.4 Emails & notifications
- [ ] Transactional email (AWS **SES** or SendGrid/Resend) for: verification results, reject
      reasons, password reset, account alerts.
- [ ] Offline notifications via a queue (SQS) rather than inline DB writes.

---

## 4. Phase 3 — Scale, reliability & advanced features (months 3–6)

> Goal: performance headroom, richer product features, and operational maturity.

### Infrastructure
- [ ] **Caching** — Redis (ElastiCache/Upstash) for hot queries, sessions, and AI context caching.
- [ ] **Async jobs** — SQS + worker for report generation, email, large exports, data imports.
- [ ] **Full-text search** — Postgres `tsvector`/pg_trgm, or Meilisearch for the submissions/KB search.
- [ ] **Metrics & dashboards** — CloudWatch / Grafana + Prometheus (request rate, latency, errors, AI cost).
- [ ] **Alerts** — error-rate and latency SLOs with PagerDuty/OpsGenie.
- [ ] **DR** — cross-region backups + documented restore runbook; **load test** before/after.
- [ ] **Cost governance** — budget alerts, per-service cost tags.

### Data & AI
- [ ] **RAG over knowledge base** — embeddings (pgvector) + retrieval-augmented answers with citations.
- [ ] **AI report generation** — full valuation report (PDF) from a conversation, stored in object storage.
- [ ] **Document library** per submission (Phase 2 storage) feeding the AI context.
- [ ] **GIS** — store coordinates as **PostGIS**; map view of verified records; distance/area queries.

### Product features
- [x] **Batch upload** — Excel-based batch import of property records (template with required-field indicators, dropdown validation, client-side validation, per-row error reporting). Any signed-in user can batch upload.
- [ ] Public **data explorer** with a read-only API + dataset download.
- [ ] Admin: bulk verify/reject, **edit records**, deactivate users, reject-reason workflow.
- [ ] Account: licence verification against GhIS, password reset emails, **2FA for admins**.
- [ ] Payments/subscriptions (Stripe) if monetizing reports or API access.
- [ ] Mobile PWA offline mode (cache verified dataset) / thin native wrapper.

---

## 5. Recommended target architecture

```
                    ┌────────────────────────────────────────────┐
                    │            CloudFront CDN (SPA)            │
                    │   static frontend build (immutable)        │
                    └────────────────────────────────────────────┘
                                      │  HTTPS /api/*  │  presigned URLs
                                      ▼               ▼
                            ┌──────────────────┐   ┌─────────────────────┐
                            │  ECS/Fargate API │──▶│ S3 object storage    │
                            │  (autoscaling)   │   │ (uploads, exports,   │
                            └────────┬─────────┘   │  KB originals)       │
                                     │             └─────────────────────┘
                                     ▼
                      ┌──────────────────────────┐
                      │ Managed PostgreSQL (RDS  │
                      │  or Supabase Pro + RLS)  │
                      └──────────────────────────┘
        Redis (cache)        SQS (jobs)          SES (email)       Anthropic API
        Secrets Manager (JWT_SECRET, keys)       Sentry (errors)   CloudWatch (metrics)
```

---

## 6. Sequencing & dependencies

1. **Phase 1 (must, in order):** DB access/RLS → secrets → CI + tests → observability →
   pagination fix. Everything else depends on this being solid.
2. **Phase 2 depends on:** CI passing, secrets managed, containerization.
3. **Phase 3 features depend on:** object storage (uploads) and search, which depend on Phase 2 DB/storage.

**Quick wins first (can ship this month, no infra change):** pagination fix, structured logs,
Sentry, CI + first tests, RLS enablement, real `JWT_SECRET`.

---

## 7. Rough cost guide (monthly)

| Setup | Cost |
| --- | --- |
| Today (Render free-ish + Supabase free) | ~$0–20 |
| Phase 1 (Render paid, Supabase Pro, Sentry free tier, logs) | ~$30–60 |
| Phase 2 (Fargate + CloudFront + S3 + Supabase Pro/RDS + SES) | ~$80–200 |
| Phase 3 (add Redis, queue, monitoring, replicas) | ~$150–400 |

Cloud services used correctly are cheap at this scale; monitoring and backups are the priority spend.

---

## 8. Open questions to decide

- [ ] **Database vendor** — stay on Supabase (Pro) vs move to RDS? (Supabase Pro is the lowest-risk
      path; RDS is the most "traditional prod".)
- [ ] **Hosting** — stay on Render (paid) vs AWS ECS/Fargate? (Render is fine until you need
      autoscaling/region control; Fargate is the growth path.)
- [ ] **Auth** — keep self-issued JWT (add refresh/rotation + 2FA) vs move to a managed auth
      (Clerk/Auth0)? (Managed auth is a Phase 3 option; not urgent.)
- [ ] **Data licensing** — if the bulk dataset (2,094 records) is real third-party data, clarify
      rights before any public API/explorer.
- [ ] **Monetization** — free, subscription, or per-report pricing drives whether we build Stripe.
```
