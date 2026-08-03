# LAVA — Land & Asset Valuation Assistant

LAVA is a full‑stack web application for property valuation workflows in Ghana. Any registered user submits property records, verifiers (surveyor accounts promoted by an admin) and admins verify them, and an AI assistant helps with valuation guidance (market comparison, GhIS report structure, stamp duty, Land Act 2020). A complete audit trail tracks every verification, and in‑app notifications tell submitters when their records are reviewed.

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Zustand, Recharts, react‑markdown, PWA |
| Backend | Node.js (ESM), Express, TypeScript, Helmet, express‑rate‑limit, JWT auth |
| Data | Supabase (Postgres via PostgREST), accessed with the anon key |
| Deploy | Render (Docker), auto‑deploy on push to `main` |

---

## Table of contents

1. [Architecture](#architecture)
2. [Project layout](#project-layout)
3. [Database](#database)
4. [Getting started (local)](#getting-started-local)
5. [Environment variables](#environment-variables)
6. [Deployment (Render)](#deployment-render)
7. [API reference](#api-reference)
8. [Roles & permissions](#roles--permissions)
9. [AI assistant](#ai-assistant)
10. [Useful commands](#useful-commands)

---

## Architecture

```
                    ┌───────────────────────────────┐
                    │        React frontend         │
                    │  (Vite SPA, served by Express)│
                    └──────────────┬────────────────┘
                                   │  /api/*  (fetch, Bearer JWT)
                    ┌──────────────▼────────────────┐
                    │   Express backend (port 3001) │
                    │  helmet · cors · rate limits  │
                    │  JWT auth (middleware/auth.ts)│
                    │  routes/  (auth, submissions, │
                    │  ai, knowledge-base, settings,│
                    │  notifications, audit)        │
                    └──────────────┬────────────────┘
                                   │  PostgREST (anon key)
                    ┌──────────────▼────────────────┐
                    │        Supabase (Postgres)    │
                    │  users · submissions · ...    │
                    └───────────────────────────────┘
```

**Key design points**

- **Monorepo** — `backend/` and `frontend/` are npm workspaces managed from the root `package.json`.
- **Single server** — in production, Express serves both the `/api/*` REST API and the built React SPA (`frontend/dist`), so one Render service hosts everything.
- **Auth model** — the backend issues its own signed JWTs (7‑day expiry). Passwords are bcrypt‑hashed. Supabase is used purely as a data store via PostgREST with the anon key; **RLS / service_role are not used** — authorization is enforced in the Express layer.
- **Audit & notifications** — verification changes, role changes and sign-ins (successful and failed) write to `audit_logs` (who/what/when). Entries older than **5 days are pruned automatically** (at startup, then every 6 hours). Verification changes also insert a row into `notifications` for the submission owner. The bell UI polls `GET /api/notifications` every 30 seconds.

---

## Project layout

```
lava-app/
├── backend/
│   ├── scripts/
│   │   ├── init-supabase.sql           # core tables (users, knowledge_base, settings, chat_messages, submission columns)
│   │   └── audit-and-notifications.sql # audit_logs + notifications tables
│   └── src/
│       ├── index.ts                    # Express app, security middleware, route mounting, static serving
│       ├── lib/supabase.ts             # PostgREST helpers (select/insert/update/delete/count/upsert), seeding
│       ├── middleware/auth.ts          # authenticate · optionalAuth · requireRole · signToken
│       ├── routes/                     # auth, submissions, ai, knowledgeBase, settings, notifications, audit
│       └── types.ts                    # shared JWT/User types
├── frontend/
│   └── src/
│       ├── App.tsx                     # router: landing + /app
│       ├── components/                 # LandingPage, Dashboard, SubmitData, VerificationQueue,
│       │                               # AIAssistant, KnowledgeBase, Settings, Profile, AuthModal,
│       │                               # NotificationsBell, AuditLog, Navbar, AppLayout
│       ├── store/                      # authStore, appStore (Zustand)
│       └── lib/                        # api.ts (fetch client), utils.ts
├── Dockerfile                          # multi-stage build for Render
├── render.yaml                         # Render Blueprint (env vars)
├── .env.example
└── package.json                        # workspaces + root scripts
```

---

## Database

Tables (Postgres, managed in Supabase):

| Table | Purpose |
| --- | --- |
| `submissions` | Property records submitted by any registered user. Has `user_id` (owner), `status`, `trust_score`. |
| `users` | App users: `id`, `name`, `email`, bcrypt `password`, `licence_number`, `organisation`, `role`. |
| `knowledge_base` | Documents used by the AI assistant (built-in guides + admin uploads). |
| `settings` | Key/value settings (e.g. `claude_api_key`). |
| `chat_messages` | Persisted chat history for signed-in users. |
| `audit_logs` | Audit trail of verification actions: actor, action, target, `details` (JSON), `created_at`. |
| `notifications` | In-app notifications, FK → `users(id)` with `ON DELETE CASCADE`, `read` flag. |

**Roles:** `public` · `surveyor` · `officer` (verifier) · `admin`

- `public` — a registered account with no licence number. Can submit records.
- `surveyor` — registered with a licence number (`GHIS/…`). Same access as public.
- `officer` — a **verifier**: a surveyor promoted by an admin (Users tab) so they can review/verify submissions. Not every surveyor is a verifier.
- `admin` — full access, including the Knowledge Base, Settings, Audit Trail and user management.

Run the SQL scripts in order in the Supabase **SQL Editor** (you only need the second one if starting from an existing app):

1. `backend/scripts/init-supabase.sql`
2. `backend/scripts/audit-and-notifications.sql`

---

## Getting started (local)

**Prerequisites:** Node.js 20+ and a Supabase project (free tier is fine).

```bash
# 1. Install dependencies (workspaces: backend + frontend)
npm install

# 2. Configure environment
cp .env.example .env        # fill in SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET, CLAUDE_API_KEY

# 3. Set up the database
#    → open your Supabase project → SQL Editor → run init-supabase.sql then audit-and-notifications.sql

# 4. Seed demo users (optional)
#    Creates admin@lava.gh, kofi@survey.gh (surveyor — promote to verifier in the Users tab),
#    ama@lava.gh (verifier) — password: lava2025
SEED_DEMO_USERS=1 npm run dev:backend   # run once, then remove the flag

# 5. Start everything
npm run dev            # backend on :3001, frontend on :5173 (hot reload)
```

Open http://localhost:5173 — the Vite dev server proxies `/api` to the backend.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL, e.g. `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon (publishable) key. Safe to use client-side; authz is in Express. |
| `JWT_SECRET` | Yes* | Long random string used to sign sessions. **If unset, an ephemeral secret is generated and every restart logs everyone out.** |
| `CLAUDE_API_KEY` | Yes (AI) | Anthropic API key for the AI assistant. |
| `APP_ORIGINS` | No | Comma-separated allowed CORS origins. Defaults to localhost, `*.onrender.com`, `*.vercel.app`. |
| `PORT` | No | Backend port (default `3001`). |
| `SEED_DEMO_USERS` | No | `1` to seed demo users at startup (only when `users` is empty). |

`backend/src/lib/supabase.ts` falls back to the project's Supabase URL/key if the env vars are unset, so the app boots without configuration — but you **must** set the real values in production.

> Generate a strong secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

---

## Deployment (Render)

The app deploys to Render from GitHub `Enelination/lava-app` (push to `main` triggers a build). `render.yaml` defines the service; secrets are configured in the dashboard.

1. **Create a Render account** and connect the repo (or follow your existing setup).
2. **Set environment variables** in Render → your service → Environment:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `JWT_SECRET` (long random string — **critical**)
   - `CLAUDE_API_KEY`
3. **Run the SQL scripts** in your production Supabase project's SQL Editor (see [Database](#database)).
4. Deploy (Render auto-deploys on push, or click Manual Deploy → Deploy latest commit).
5. Health check: `GET /api/health` → `{ "status": "ok" }`.

**Blueprint file (`render.yaml`):**

```yaml
services:
  - type: web
    name: lava-app
    env: docker
    dockerfilePath: ./Dockerfile
    plan: free
    healthCheckPath: /api/health
    envVars:
      - key: CLAUDE_API_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
```

**Docker build:** `Dockerfile` installs all workspace deps, builds backend (`tsc`) and frontend (`vite build`), then serves `backend/dist` + `frontend/dist` on port `3001`.

---

## API reference

All endpoints are under `/api`. Auth-protected routes require `Authorization: Bearer <token>`.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | public | Create account (≥8 char password; licence number ⇒ `surveyor` role) |
| `POST` | `/api/auth/login` | public | Login with email **or** licence number + password → `{ token, user }` |
| `GET` | `/api/auth/me` | auth | Current user profile |
| `PATCH` | `/api/auth/profile` | auth | Update name/email/licence/organisation |
| `POST` | `/api/auth/change-password` | auth | Change password (needs current password) |
| `GET` | `/api/submissions` | public | List submissions (filter/sort via query params) |
| `GET` | `/api/submissions/stats` | public | Dashboard metrics |
| `POST` | `/api/submissions` | any signed-in user | Create submission (owner set from token) |
| `PATCH` | `/api/submissions/:id` | verifier, admin | Update status/trust → **writes audit log + notifies owner** |
| `GET` | `/api/notifications` | auth | Latest 50 notifications + unread count |
| `PATCH` | `/api/notifications/read` | auth | Mark specific IDs (or all) as read |
| `GET` | `/api/audit` | admin | Audit trail (actor, action, details, timestamp) |
| `GET` | `/api/admin/users` | admin | List all users (passwords excluded) |
| `PATCH` | `/api/admin/users/:id` | admin | Change a user's role (e.g. promote surveyor → verifier) |
| `GET` | `/api/knowledge-base` | public | List knowledge-base documents |
| `GET` | `/api/knowledge-base/:id` | admin | Get a document with full content |
| `POST` | `/api/knowledge-base/upload` | admin | Upload a document |
| `PATCH` | `/api/knowledge-base/:id` | admin | Rename / replace a document's content |
| `DELETE` | `/api/knowledge-base/:id` | admin | Remove an uploaded document |
| `GET` | `/api/ai/status` | public | AI feature status |
| `POST` | `/api/ai/chat` | auth/optional | Chat with the assistant (persists for signed-in users) |
| `GET` | `/api/ai/history` | auth | Chat history |
| `DELETE` | `/api/ai/history` | auth | Clear chat history |
| `GET` | `/api/settings` | admin | App settings |
| `PUT` | `/api/settings` | admin | Update settings |
| `GET` | `/api/health` | public | Health check |

**Interactive documentation (Swagger UI):**

- UI: `GET /api-docs`
- Raw OpenAPI spec (JSON): `GET /api-docs.json`

The Swagger UI lets you explore every endpoint, see request/response schemas, and send authenticated requests — click the green **Authorize** button and paste a JWT from `POST /api/auth/login` (or use the "Try it out" button on login to get one).

**Rate limits** (express-rate-limit): login/change-password 10 per 15 min · register 5 per hour · AI chat 90 per 15 min.

---

## Roles & permissions

| Capability | public | surveyor | officer (verifier) | admin |
| --- | :-: | :-: | :-: | :-: |
| View landing + submit-adjacent info | ✅ | ✅ | ✅ | ✅ |
| View dashboard, browse submissions | ✅ | ✅ | ✅ | ✅ |
| Submit a property record | ✅ | ✅ | ✅ | ✅ |
| Verify / change submission status | ❌ | ❌ | ✅ | ✅ |
| View notifications | ✅ | ✅ | ✅ | ✅ |
| Upload / delete knowledge-base docs | ❌ | ❌ | ❌ | ✅ |
| Manage settings (incl. Claude API key) | ❌ | ❌ | ❌ | ✅ |
| View audit trail | ❌ | ❌ | ❌ | ✅ |
| Manage users (promote surveyor → verifier) | ❌ | ❌ | ❌ | ✅ |
| Chat with AI assistant | ✅ (guest) | ✅ | ✅ | ✅ |

Guests (no token) can browse and use the AI assistant in "explorer" mode; chat history for guests is **not** persisted.

---

## AI assistant

Built on Anthropic's Claude, grounded in the `knowledge_base` documents:

- **Market Comparison Analysis** — comparables, adjustments (1–10% for location, size, condition, etc.), adjusted rate calculation.
- **GhIS valuation report format** — the 10-section required structure.
- **Stamp Duty (Act 689)** — conveyance/lease/mortgage duty rates.
- **Land Act 2020 (Act 1036)** — stool/family/state lands, freehold vs leasehold.

Admin uploads additional PDFs/DOCX via the Knowledge Base page; the assistant uses them as context in chat. Guest conversations are ephemeral; signed-in chats are stored in `chat_messages`.

---

## Useful commands

```bash
npm run dev            # run backend + frontend with hot reload
npm run dev:backend    # backend only (tsx watch)
npm run dev:frontend   # frontend only (vite)
npm run build          # type-check + build backend AND frontend
npm run start          # serve the production build (backend/dist/index.js)

# inside backend/
npm run build          # tsc → dist/
npm start              # node dist/index.js

# inside frontend/
npm run build          # tsc -b && vite build
```

---

## Notes & gotchas

- **JWT_SECRET must be set in production.** Without it, sessions are signed with an ephemeral secret that changes on every deploy/restart, logging all users out.
- **RLS/service_role is intentionally not used.** Supabase is treated as a plain Postgres store; all authorization happens in Express. Revisit if you need per-row security at the database layer.
- **The `submissions` table predates the app** (original data). `init-supabase.sql` only adds the `user_id` column and indexes to it — it never recreates it.
- **Notifications only fire for submissions that have a `user_id` owner**; legacy rows without an owner are skipped silently.
- **Audit logs are pruned after 5 days** (`pruneAuditLogs()` runs at startup and every 6 hours). This is a retention policy, not an archival system.
