# START HERE — Setup, Run, Docker & Deploy Guide

Everything you need to install dependencies, run the app locally, understand the Docker
setup, and deploy it to free hosting. For architecture/decisions see `workflow.md`; for the
requirement checklist see `constraints.md` / `VALIDATION.md`.

- **Frontend (local):** http://localhost:3000
- **Backend (local):** http://localhost:8000 · interactive API docs at **http://localhost:8000/docs**

---

## 0. TL;DR (Docker — the easy path)

```bash
cp .env.example .env          # 1. create env (defaults work for local)
docker compose up --build     # 2. build + start frontend, backend, db
# open http://localhost:3000   (API docs: http://localhost:8000/docs)
docker compose exec backend python -m app.seed   # 3. (optional) demo data
docker compose down           # stop   (add -v to also wipe the database)
```
That's it — you don't need Python or Node installed for this path, only Docker.

---

## 1. Dependencies / prerequisites

### Path A — Run with Docker (recommended, fewest installs)
| Tool | Version | Why | Install |
|---|---|---|---|
| Docker Desktop | latest | Builds & runs all 3 services (includes Compose v2) | https://www.docker.com/products/docker-desktop/ — or `brew install --cask docker` |
| Git | any | Version control / cloning | `brew install git` |

Start Docker Desktop once and wait until the whale icon is steady before running compose.

### Path B — Run without Docker (local dev)
| Tool | Version | Why | Install (macOS) |
|---|---|---|---|
| Python | 3.12+ | Backend | `brew install python@3.12` |
| Node.js | 20+ | Frontend (Vite) | `brew install node@20` |
| PostgreSQL | 16 | Database | `brew install postgresql@16` then `brew services start postgresql@16` |
| Git | any | — | `brew install git` |

### For deployment you'll also need (free) accounts
- **Docker Hub** — host the backend image — https://hub.docker.com
- A backend host — **Render** (easiest) / Railway / Fly.io
- A frontend host — **Vercel** / Netlify
- Managed Postgres — Render Postgres / Neon / Supabase (all have free tiers)

### What the app actually depends on (for reference)
**Backend** (`backend/requirements.txt`): FastAPI, Uvicorn, SQLAlchemy 2, psycopg2-binary,
Pydantic 2, pydantic-settings, email-validator. Dev: pytest, httpx.
**Frontend** (`frontend/package.json`): React 18, react-router-dom, @tanstack/react-query,
axios, react-hot-toast, lucide-react. Build: Vite, Tailwind CSS, PostCSS, Autoprefixer.

---

## 2. Run locally with Docker (full walkthrough)

```bash
cd <this-folder>
cp .env.example .env
docker compose up --build          # first run builds images (a few minutes)
```
What happens:
1. **db** (`postgres:16-alpine`) starts and becomes *healthy* (`pg_isready`).
2. **backend** waits for db health, then auto-creates tables and serves on `:8000`.
3. **frontend** builds the React bundle and serves it via nginx on `:3000`.

Verify:
```bash
curl http://localhost:8000/health            # {"status":"ok"}
open http://localhost:3000                    # the dashboard UI
open http://localhost:8000/docs               # Swagger UI to try the API
```
Seed demo data (optional):
```bash
docker compose exec backend python -m app.seed
```
Stop / reset:
```bash
docker compose down        # stop & remove containers (DB volume kept)
docker compose down -v     # also delete the database volume (fresh start)
docker compose logs -f backend   # tail logs if something looks off
```

---

## 3. Docker tutorial (how this project is containerized)

**Concepts in 30 seconds**
- **Image** = a built, immutable snapshot of an app + its deps (from a `Dockerfile`).
- **Container** = a running instance of an image.
- **Volume** = storage that survives container restarts (here: Postgres data → `pgdata`).
- **Compose** = one file describing several containers + how they connect.

**This repo**
- `backend/Dockerfile` — `python:3.12-slim`, installs deps, copies `app/`, runs as a
  **non-root** user, launches `uvicorn`. Slim base + `psycopg2-binary` wheels = no compiler in the image.
- `frontend/Dockerfile` — **multi-stage**: stage 1 (`node:20-alpine`) builds the static
  bundle; stage 2 (`nginx:alpine`) serves it. The final image ships only static files + nginx.
- `frontend/nginx.conf` — SPA fallback (`try_files … /index.html`) so client-side routes work.
- `docker-compose.yml` — three services on one private network:
  - `db` with a **named volume** `pgdata` and a healthcheck.
  - `backend` reads `DATABASE_URL`/`CORS_ORIGINS` from env, `depends_on` db **healthy**.
  - `frontend` gets `REACT_APP_API_URL` as a **build arg** (baked in at build time).
  - **No credentials are hardcoded** — all come from `.env`.

**Handy commands**
```bash
docker compose ps                 # status of services
docker compose build backend      # rebuild just one service
docker compose up -d              # start detached (background)
docker compose exec backend sh    # shell into the backend container
docker image ls | grep dharmender # see built images
```

---

## 4. Run locally without Docker (dev mode, hot reload)

**Backend** (terminal 1) — needs a Postgres running locally:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL="postgresql+psycopg2://<user>:<pass>@localhost:5432/inventory"
export CORS_ORIGINS="http://localhost:5173"
uvicorn app.main:app --reload          # http://localhost:8000
```
Create the database first if needed: `createdb inventory`.

**Frontend** (terminal 2):
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8000" > .env
npm run dev                              # http://localhost:5173
```

---

## 5. Testing

```bash
cd backend
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q          # 16 tests — covers all 9 business rules
```
Tests use an in-memory SQLite DB (via dependency override), so no Postgres is required to run them.

Frontend production build check:
```bash
cd frontend && npm install && npm run build   # outputs dist/
```

---

## 6. Deployment tutorial (free tiers)

```
React build  →  Vercel/Netlify (static)
                     │  calls (HTTPS)
                     ▼
Backend image → Docker Hub → Render/Railway/Fly  →  Managed Postgres
```
You deploy three things: the **DB**, the **backend image**, and the **frontend static site**.

### Step 1 — Push the backend image to Docker Hub
> On Apple Silicon you **must** target `linux/amd64`, or the host will fail with "exec format error".

```bash
cd backend
docker login
docker buildx build --platform linux/amd64 \
  -t <dockerhub-username>/inventory-backend:latest --push .
```
Your Docker Hub image link is `https://hub.docker.com/r/<dockerhub-username>/inventory-backend`.

### Step 2 — Create a managed Postgres
Pick one (free): **Render → New → PostgreSQL**, **Neon**, or **Supabase**. Copy its connection
string. It usually looks like `postgresql://user:pass@host:5432/dbname` — that works as-is
(SQLAlchemy uses psycopg2 for `postgresql://`). You may also write it as
`postgresql+psycopg2://...`.

### Step 3 — Deploy the backend
**Render (recommended):**
1. New → **Web Service** → **Deploy an existing image from a registry**.
2. Image URL = `<dockerhub-username>/inventory-backend:latest`.
3. Environment variables:
   - `DATABASE_URL` = your managed Postgres URL (use the **internal** URL if the DB is also on Render)
   - `CORS_ORIGINS` = your frontend URL (set after Step 4; can start with `*` to test)
4. Health check path: `/health`. Deploy. Note the URL, e.g. `https://your-api.onrender.com`.

**Railway:** New Project → Deploy from Docker image → add the same env vars → expose port 8000.
**Fly.io:** `fly launch --image <user>/inventory-backend:latest`, then `fly secrets set DATABASE_URL=... CORS_ORIGINS=...`.

Confirm: open `https://your-api.onrender.com/docs`.

### Step 4 — Deploy the frontend
**Vercel:**
1. Import the repo → set **Root Directory** = `frontend`.
2. Framework preset **Vite** (build `npm run build`, output `dist`).
3. Environment Variable: `REACT_APP_API_URL` = `https://your-api.onrender.com`.
4. Deploy → note the URL, e.g. `https://your-app.vercel.app`.

**Netlify:** Base directory `frontend`, build `npm run build`, publish `frontend/dist`, env
`REACT_APP_API_URL=...`. (SPA fallback is handled by `frontend/public/_redirects`.)

> `REACT_APP_API_URL` is read at **build time**. If you change it, **redeploy** the frontend.

### Step 5 — Wire CORS and verify
1. Set the backend's `CORS_ORIGINS` to your exact frontend origin
   (e.g. `https://your-app.vercel.app`) and redeploy the backend.
2. Open the frontend, create a product/customer/order — confirm it persists.

### Step 6 — Fill in the submission links
Edit the table at the top of `README.md` with: GitHub repo URL, Docker Hub image URL,
live frontend URL, live backend API URL.

---

## 7. Environment variables reference
| Variable | Used by | Example | Notes |
|---|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | db (compose) | `inventory` | Local compose only |
| `DATABASE_URL` | backend | `postgresql+psycopg2://u:p@db:5432/inventory` | Compose uses host `db`; prod uses managed URL |
| `CORS_ORIGINS` | backend | `http://localhost:3000` | Comma-separated; set to frontend origin in prod |
| `LOW_STOCK_THRESHOLD` | backend | `10` | Default when a product sets none |
| `REACT_APP_API_URL` | frontend | `http://localhost:8000` | **Build-time**; the live backend URL in prod |

Never commit a real `.env` (it's git-ignored). Share only `.env.example`.

---

## 8. Troubleshooting
| Symptom | Fix |
|---|---|
| `docker compose` errors / hangs | Make sure Docker Desktop is fully started first. |
| Frontend loads but data calls fail | `REACT_APP_API_URL` wrong, or backend `CORS_ORIGINS` doesn't include the frontend origin. Rebuild/redeploy frontend after changing the URL. |
| Backend `exec format error` on host | Image built for arm64 — rebuild with `--platform linux/amd64`. |
| `port is already allocated` locally | Something else uses 3000/8000 — stop it or change the published port in `docker-compose.yml`. |
| Backend can't reach DB | Check `DATABASE_URL` host/creds; in compose the host is `db`. |
| Render free service slow to wake | Free tier cold-starts after idle (~50s); first request is slow. |

---

## 9. Command cheat sheet
```bash
# Local (Docker)
docker compose up --build           # build + run
docker compose up -d                # run detached
docker compose down [-v]            # stop [+wipe db]
docker compose logs -f backend      # logs
docker compose exec backend python -m app.seed   # demo data

# Backend dev
uvicorn app.main:app --reload
pytest -q

# Frontend dev
npm run dev
npm run build

# Deploy backend image
docker buildx build --platform linux/amd64 -t <user>/inventory-backend:latest --push .
```
