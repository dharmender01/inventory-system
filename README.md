# StockFlow — Inventory & Order Management System

A production-ready, fully containerized full-stack app to manage **products, customers, orders, and inventory**.

- **Backend:** Python · FastAPI · SQLAlchemy 2 · PostgreSQL
- **Frontend:** React (JavaScript) · Vite · Tailwind CSS · TanStack Query
- **Infra:** Docker · Docker Compose · deployable free (Render/Railway/Fly + Vercel/Netlify)

> **New here? Start with [`START.md`](./START.md)** — install deps, run locally, Docker & deployment tutorials.

> Planning & validation artifacts live alongside this README: [`workflow.md`](./workflow.md)
> (architecture + decisions) and [`constraints.md`](./constraints.md) (acceptance checklist),
> with the filled-in result in [`VALIDATION.md`](./VALIDATION.md). Source of truth:
> [`Technical Assessment (Software Engineer).md`](./Technical%20Assessment%20(Software%20Engineer).md).

---

## Submission links

| Deliverable | URL |
|---|---|
| GitHub repository | _<add after pushing>_ |
| Docker Hub (backend image) | _<add after `docker push`>_ |
| Live frontend | _<add after Vercel/Netlify deploy>_ |
| Live backend API (`/docs`) | _<add after Render/Railway/Fly deploy>_ |

---

## Architecture

```
React SPA (Vercel/Netlify, static)  ──HTTPS/JSON──►  FastAPI (Render/Railway/Fly, Docker)  ──SQL──►  PostgreSQL (managed)
        REACT_APP_API_URL (build-time)                    DATABASE_URL, CORS_ORIGINS (runtime)
```
Locally the same three tiers run as Docker Compose services (`frontend`, `backend`, `db`) on one private network with a named volume for Postgres. See `workflow.md` §1 for the full topology and rationale.

## Project structure
```
.
├── backend/                 FastAPI service
│   ├── app/
│   │   ├── main.py          app factory, CORS, health, exception handlers
│   │   ├── core/config.py   env-driven settings
│   │   ├── db/              engine + session
│   │   ├── models/         SQLAlchemy: product, customer, order, order_item
│   │   ├── schemas/        Pydantic request/response
│   │   ├── routers/        products, customers, orders, dashboard
│   │   └── services/       order_service.py (transactional business logic)
│   ├── tests/              pytest suite (16 tests, the 9 business rules)
│   ├── Dockerfile          slim, non-root
│   └── requirements*.txt
├── frontend/                React + Vite + Tailwind SPA
│   ├── src/{api,components,pages,lib}
│   ├── Dockerfile          multi-stage build → nginx:alpine
│   └── nginx.conf          SPA fallback
├── docker-compose.yml       frontend + backend + db
├── .env.example             copy to .env
├── workflow.md  constraints.md  VALIDATION.md
```

---

## Run locally with Docker (recommended)

```bash
cp .env.example .env          # adjust credentials if you like
docker compose up --build
```
- Frontend → http://localhost:3000
- Backend  → http://localhost:8000  (interactive docs at `/docs`)
- Postgres → internal only (named volume `pgdata`)

Optional demo data:
```bash
docker compose exec backend python -m app.seed
```

## Run locally without Docker (dev)

**Backend** (needs a local Postgres, or point `DATABASE_URL` at one):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL="postgresql+psycopg2://USER:PASS@localhost:5432/inventory"
export CORS_ORIGINS="http://localhost:5173"
uvicorn app.main:app --reload
```
**Frontend:**
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8000" > .env
npm run dev            # http://localhost:5173
```

## Tests
```bash
cd backend && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q              # 16 passed
```
The suite uses an in-memory SQLite DB (via dependency override) so it runs with no external services.

---

## API reference

Base path is the backend root. Full interactive docs at `/docs`.

| Resource | Method | Path | Notes |
|---|---|---|---|
| Products | POST | `/products` | 201; 409 duplicate SKU; 422 invalid |
| | GET | `/products` | list |
| | GET | `/products/{id}` | 404 if missing |
| | PUT | `/products/{id}` | partial/full update |
| | DELETE | `/products/{id}` | 204; 409 if referenced by an order |
| Customers | POST | `/customers` | 201; 409 duplicate email |
| | GET | `/customers` / `/customers/{id}` | list / fetch |
| | DELETE | `/customers/{id}` | 204; 409 if referenced |
| Orders | POST | `/orders` | validates stock, decrements, computes total |
| | GET | `/orders` / `/orders/{id}` | list / fetch (with line items) |
| | DELETE | `/orders/{id}` | cancel; restores stock |
| Dashboard | GET | `/dashboard/summary` | totals + low-stock list |
| Meta | GET | `/health` | `{"status":"ok"}` |

**Create order payload**
```json
{ "customer_id": 1, "items": [ { "product_id": 2, "quantity": 3 } ] }
```
The backend computes `total_amount` (client-supplied totals are ignored) and snapshots each line's unit price.

## Business rules (assessment §4)
Unique SKU · unique email · non-negative quantity (app + DB CHECK) · reject orders exceeding stock · auto-decrement stock on order · backend-computed totals · validation on every write · correct status codes (201/200/204/404/409/422) · centralized error handling. Each is covered by a test — see `VALIDATION.md`.

---

## Deployment (free tiers)

> **Apple Silicon note:** build the backend image for `linux/amd64` or it won't run on the hosts.

**1. Backend image → Docker Hub**
```bash
cd backend
docker buildx build --platform linux/amd64 -t <dockerhub-user>/inventory-backend:latest --push .
```

**2. Database** — create a managed Postgres (Render/Railway/Neon/Supabase) and copy its connection URL.

**3. Backend** — deploy the image on **Render / Railway / Fly.io**. Set env:
- `DATABASE_URL` = managed Postgres URL (SQLAlchemy form: `postgresql+psycopg2://...`)
- `CORS_ORIGINS` = your live frontend origin
Health check path: `/health`.

**4. Frontend** — deploy on **Vercel / Netlify** from `frontend/`:
- Build command `npm run build`, output `dist`
- Env (build-time): `REACT_APP_API_URL` = live backend URL

**5. Wire CORS** — set the backend's `CORS_ORIGINS` to the deployed frontend URL, redeploy, verify end-to-end.

Free-tier caveats (note for the reviewer): Render free services cold-start after idling and free Postgres expires after a limited window; pick a combination that survives your review window. See `workflow.md` §9.

## Scope
Implements exactly the assessment's endpoints and rules — **no** auth, customer/order editing, payments, or other features it doesn't ask for. Out-of-scope list: `constraints.md` §11.
