**Purpose**
- Central guide for agents working in this repo. Explains structure, how to run/build, environment variables, coding conventions, and integration points. Follow this file for any changes inside its scope (entire repository).

**Stack Overview**
- Backend: `Node.js` + `Express`, JWT auth, rate limiting, Helmet, CORS, Swagger.
- Auth storage: SQLite (file `backend/database/auth.db`).
- Domain data: Oracle DB via `oracledb` driver (optional for dev; see “Oracle Setup”).
- Frontend: Angular 20 (standalone components) + PrimeNG 20 + custom SCSS.
- Docker: Separate images for frontend (`Dockerfile`) and backend (`Dockerfileapi`).

**Project Layout**
- `backend/` — Express API
  - `server.js` — main entry
  - `config/` — databases: `authdb.js` (SQLite), `oracle.js` (Oracle wrapper), `database.js` (compat layer)
  - `middleware/` — `auth.js` (JWT), `apiKeyAuth.js`, `errorHandler.js`
  - `routes/` — `auth.js`, `dashboard.js`, `users.js`, `configuracoes.js`, `natal.routes.js`
  - `swagger.json` — API docs served at `/api-docs`
  - `database/` — `auth.db` (SQLite file), `schema.sql`, `seed.sql`
- `frontend/` — Angular app
  - `src/app` — components, services, guards, interceptors, layout
  - `src/environments` — `environment.ts` (dev), `environment.production.ts`
  - Uses standalone components and feature-based routing in `app.routes.ts`

**How To Run (Dev)**
- Requirements: Node.js 18+; npm. Oracle is optional for most features.
- Root scripts:
  - `npm run install:all` — install backend and frontend deps
  - `npm start` (or `npm run dev`) — start backend (port 3000) + frontend (port 4200)
  - `npm run start:backend` — backend only
  - `npm run start:frontend` — frontend only
- Backend env (create `backend/.env` or set env vars):
  - `PORT` (default 3000)
  - `NODE_ENV` (e.g., `development`)
  - `JWT_SECRET` (required for login; any strong string in dev)
  - `CORS_ORIGIN` (default `http://localhost:4200`)
  - `AUTH_DB_PATH` (optional; defaults to `backend/database/auth.db`)
  - Oracle (optional; needed for domain routes `/configuracoes` and `/natal/*`):
    - `ORACLE_USER`, `ORACLE_PASSWORD`
    - `ORACLE_CONNECTION_STRING` or combo of `ORACLE_HOST`, `ORACLE_PORT`, `ORACLE_SERVICE_NAME` (or `ORACLE_SID`)
    - Optional: `ORACLE_CLIENT_LIB_DIR` if using thick client
  - Refresh/Register endpoints: set `API_KEY` if calling `/auth/refresh` or `/auth/register` from trusted clients

**How To Run (Docker)**
- Frontend image (serves Angular build via Nginx):
  - Build: `docker build -f Dockerfile -t app-frontend .`
  - Run: `docker run -p 8080:80 app-frontend`
- Backend image:
  - Build: `docker build -f Dockerfileapi -t app-backend .`
  - Run: `docker run -e JWT_SECRET=... -e CORS_ORIGIN=http://localhost:4200 -p 3001:3001 app-backend`
  - Note: Container defaults to `PORT=3001`. Provide Oracle env vars if needed.

**Backend Details**
- Entry: `backend/server.js`
  - Health: `GET /health`
  - Swagger UI: `GET /api-docs`
  - Auth: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` (requires `x-api-key`), `POST /auth/validate`, `GET /auth/me`
  - Protected routes (JWT in `Authorization: Bearer <token>`):
    - `/dashboard`, `/dashboard/stats`, `/dashboard/profile` (uses SQLite auth DB for user metadata)
    - `/users` CRUD (SQLite)
    - `/configuracoes` and `/natal/*` (require Oracle; guarded with 503 when Oracle pool is unavailable)
- Databases
  - SQLite (Auth): initialized on boot; default admin user `admin / admin123`. See `backend/config/authdb.js`.
  - Oracle (Domain): wrapper in `backend/config/oracle.js` provides a SQLite-like interface:
    - `query(sql, params)`, `all/get/run` with placeholder conversion
    - Converts `?` to Oracle binds `:bN`, normalizes boolean comparisons, and maps `LIMIT ? OFFSET ?` to `OFFSET :b1 ROWS FETCH NEXT :b2 ROWS ONLY`
- Security
  - Helmet + CORS
  - Rate limiting globally and for `/auth/login`
  - JWT expiry 24h; refresh-token table (`sessions`) stored in SQLite (hashes only)

**Frontend Details**
- Angular 20 standalone architecture; routes in `frontend/src/app/app.routes.ts`.
- Auth
  - Guard: `auth-guard.ts` redirects unauthenticated users to `/login` with `returnUrl`.
  - Interceptor: `auth-interceptor.ts` attaches JWT and handles 401 with automatic refresh + logout fallback.
  - Service: `services/auth.ts` manages localStorage, inactivity timer, and token refresh (uses `environment.apiKey` for refresh/register where required).
- Environment
  - Dev: `frontend/src/environments/environment.ts` points to `http://localhost:3000`.
  - Prod: `frontend/src/environments/environment.production.ts` points to `https://tematicoapi.zapchatbr.com`.
- Features
  - Login, Dashboard, Users (list/form), Change Password, Reset Password
  - Natal module UI (`components/reserva-natal`) integrates with Oracle-backed endpoints `/natal/*`.

**Conventions (Agents Must Follow)**
- Language & messaging:
  - Keep code and user-facing messages in pt-BR where existing files do so.
  - Prefer concise logs; reuse existing log styles (e.g., emojis/markers are present; do not introduce noisy logs).
- Backend code style:
  - Use CommonJS requires to match existing files.
  - Keep middleware patterns consistent (`ApiError`, `errorHandler`). Prefer returning `next(new ApiError(...))` for errors.
  - For DB access: use `getAuthDb()` for auth/users; use `getDatabase()` for domain (which delegates to Oracle). If using Oracle directly, prefer `getDatabase()` to respect the compatibility layer.
  - For pagination: follow `LIMIT ? OFFSET ?` in SQL; the Oracle layer converts as needed.
  - Do not introduce unrelated refactors; keep changes minimal and scoped.
- Frontend code style:
  - Use standalone components; lazy-load via `loadComponent` in routes.
  - Keep services under `src/app/services` and reuse `environment.apiUrl`.
  - Maintain PrimeNG usage patterns and SCSS organization already present.
  - Avoid introducing new state libs; leverage RxJS and services.
- Files & naming:
  - Do not rename existing files unless explicitly requested.
  - Follow existing naming (kebab-case for files, PascalCase for components/classes).

**Common Tasks**
- Add a new protected API route
  - Create in `backend/routes/<feature>.js`; export an Express router.
  - Wire in `backend/server.js` with `authenticateToken`. If depends on Oracle, also use the `requireDomainDb` pattern.
  - Return errors via `ApiError`; success as JSON with a stable shape.
- Add a new Angular page
  - Create standalone component under `frontend/src/app/components/<name>/` with `.ts/.html/.scss`.
  - Add route in `app.routes.ts` with lazy `loadComponent`.
  - If it calls the backend, add a method to an existing service or create a new service under `services/`.

**Environment & Secrets**
- Do not commit real secrets. Use `.env` locally for backend.
- Required for login: set `JWT_SECRET` (any string in dev). Without it, `/auth/login` fails.
- Oracle is optional. If not configured, routes under `/configuracoes` and `/natal/*` return `503 DOMAIN_DB_UNAVAILABLE` by design.

**Validation & Testing**
- No automated tests are configured. Validate by:
  - Backend: run `npm run start:backend`, check `GET /health`, `POST /auth/login` with `admin/admin123`.
  - Frontend: run `npm run start:frontend`, then login and navigate to dashboard/users.
  - If Oracle is set, verify `/natal/mesas`, `/natal/reservas` flows from the UI.

**Known Issues / TODOs**
- Encoding artifacts (mojibake) are present in some comments/README logs. Cosmetic only.
- `backend/routes/natal.js` appears deprecated/incomplete. Use `backend/routes/natal.routes.js`.
- Some route files reference `getDatabase()` without importing it; if you touch those files, ensure the correct import from `backend/config/database` and prefer `getAuthDb()` for auth-only tables.
- `swagger.json` is minimal and may be truncated; extend/update when adding routes.
- SQLite `RETURNING id` is used in some places; in SQLite the insert id is available via `this.lastID`. Keep compatibility in mind.

**Contact Points (for Agents)**
- For auth/session work: `backend/config/authdb.js`, `backend/middleware/auth.js`, `backend/routes/auth.js`.
- For domain data (Oracle): `backend/config/oracle.js` and routes under `backend/routes/*` that use `getDatabase()` or `getOracle()`.
- For UI flows: `frontend/src/app/components/*` and API calls in `frontend/src/app/services/*`.

**Ready Checklist (before executing prompts)**
- Can run both servers locally (`npm start` works) or at least backend-only.
- `backend/.env` contains at minimum: `JWT_SECRET`, optionally Oracle vars.
- Frontend `environment.ts` points to the backend base URL.
- Confirm admin login works: `admin / admin123`.

