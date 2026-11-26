# Architecture

This folder records **how** the application is built and **why**. Keep it short and up to date. AI agents load `docs/architecture/README.md` and `docs/architecture/decisions.md` in every session (see `opencode.jsonc`).

For the product **what** (requirements), see `docs/requirements.md`. For domain terms, see `docs/glossary.md`.

## Provided infrastructure

The starter contains infrastructure only, with no product features.

| Part | Location | Technology |
| --- | --- | --- |
| Frontend | `apps/web` | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Backend | `apps/api` | Node.js, Express 5, TypeScript |
| Unit tests | `apps/*/src/**/*.test.ts(x)` | Vitest, React Testing Library, Supertest |
| End-to-end tests | `e2e/` | Playwright |
| Workspace | root `package.json` | npm workspaces |

### Frontend (`apps/web`)

- `src/main.tsx` renders `src/App.tsx`, the starter page.
- `src/api.ts` contains the functions that call the backend.
- Styling uses Tailwind utility classes (`src/index.css` imports Tailwind).

### Backend (`apps/api`)

- The whole API is in `src/server.ts`. It exports the Express `app` (so tests can use it without a network port) and starts listening only when the file is run directly.
- Starter state: one endpoint exists — `GET /api/version` → `{ "name": "api", "version": "0.1.0" }`. The MVP endpoints are listed in “Cross-cutting rules” below.
- In development Node.js runs the TypeScript file directly (`node --watch`); `npm run build` compiles it to `dist/`.
- In production (`npm start` runs `dist/server.js`) Express also serves the built frontend from `apps/web/dist` (`serveFrontend`). Every non-`/api` GET request gets `index.html`. The port comes from `PORT`, then `API_PORT`, then 3001.

## How the applications communicate

```
Browser ──► Vite dev server (localhost:5173) ──/api/*──► Express (localhost:3001)
```

- The frontend uses relative URLs such as `fetch('/api/version')`.
- In development, the Vite proxy (`apps/web/vite.config.ts`) forwards every `/api/*` request to Express. The browser sees a single origin, so no CORS setup is needed.
- Ports can be changed with the `API_PORT` and `WEB_PORT` environment variables.
- In production there is no Vite: Express serves the frontend and the API from the same origin, so relative `/api` URLs keep working and still no CORS is needed. The whole application deploys as one Node.js web service (build: `npm run build`, start: `npm start`).

## Cross-cutting rules

### API and HTTP

- All API routes live under `/api/...` (see `docs/architecture/backend.md`). The decided endpoints only: `GET /api/version`, `GET /api/catch-records`, `POST /api/catch-records`, `PUT /api/catch-records/:id`, `DELETE /api/catch-records/:id`.
- `POST` and `PUT` accept a JSON object body with exactly `caughtAt`, `anglerName`, `fishCategory`, `fishSpecies`, `fishCount`, `totalWeightKg`. Matching the existing `express.json()` behavior: malformed JSON with a JSON `Content-Type` returns `400 { "field": "body", "message": "Invalid JSON" }`; a missing or non-JSON `Content-Type`, an empty body, `null`, an array, or another non-object body returns `400 { "field": "body", "message": "Invalid request body" }`. An `id` or unknown field returns `400 { "field": "body", "message": "Unexpected field: <field name>" }`. `anglerName` and `fishSpecies` are trimmed once before validation and stored normalized.
- Use consistent JSON shapes: `400` validation errors return `{ "field": "<field name>", "message": "<human-readable explanation>" }` with field names limited to the six above (or `body` for whole-body errors); `404` for missing catch records returns `{ "message": "Catch record not found" }`; unexpected `500` (including a corrupt store) returns `{ "message": "Internal server error" }` with no stack traces. Exact validation messages and whole-body/multi-field error precedence are in `docs/architecture/backend.md`; exact UI messages are in `docs/architecture/frontend.md`.

### Validation and errors

- Validate request input (body, params, query) before using it. Return `400` with a clear JSON error for invalid input, `404` for missing resources. Never leak stack traces to clients.
- Frontend forms use `noValidate` / no submission-blocking native `required` validation: the backend receives the request and returns the inline API field error required by the acceptance criteria.
- Express 5 forwards errors thrown in `async` handlers to error middleware; add a single error-handling middleware when needed.

### Configuration and environment

- Secrets and environment-specific values (for example database URLs, API keys) come from environment variables. Never hard-code secrets, never commit `.env`, and keep `.env.example` up to date with variable names and fake values.
- Ports: `PORT`, then `API_PORT`, then default `3001` (backend behavior as implemented in `apps/api`). E2E runs override these with `3101` (API) and `5174` (frontend); see “End-to-end tests” below.
- `DATA_DIR`: optional directory containing the writable `store.json`. When unset, the repository `data/` directory is used; tests set a temporary `DATA_DIR`. `data/seed.json` is immutable and resolved relative to `import.meta.url`.

### Storage and persistence (current direction)

- The API owns a writable JSON store at `store.json` in `DATA_DIR`, or in the repository `data/` directory when `DATA_DIR` is unset (see `docs/architecture/decisions.md`). The frontend does not read/write persistence directly except through the API.
- Immutable `data/seed.json`, resolved relative to `import.meta.url`, initializes the store once when `store.json` is missing. `ensureStoreInitialized` is lazy, idempotent, cached, and called before every catch-record route so imported apps/Supertest are seeded too.
- Stored JSON is validated on read; invalid or corrupt data yields the safe `500` JSON error. Writes use a single in-process promise queue with a temporary sibling file and rename.
- The deployment host must provide a persistent disk/volume for the directory containing `store.json`.
- The small backend module split, atomic temp-file rename, single write queue, validation on read, and future Fishing Trips compatibility are intentional MVP choices, not over-engineering (see `docs/architecture/decisions.md`).

### End-to-end tests

- Playwright covers one sequential MVP scenario in this fixed order: fresh seed list → Fish category filter/statistics → add → edit → delete. During MVP implementation, replace the starter `e2e/smoke.spec.ts` Welcome/version assertions with this scenario.
- The scenario targets rows with `data-testid="catch-record-<id>"` for tests only; the Catch record ID is never visually displayed.
- E2E uses its own ports and store, never the development/production ports or the real `data/store.json`:
  - API on port `3101`, frontend on port `5174`.
  - `workers: 1`; already-running local servers are never reused.
  - The API receives `DATA_DIR=test-results/angler-journal-e2e-data`.
  - Cleanup uses Node `fs` APIs only (no shell commands), in this exact sequence: `playwright.config.ts` removes the E2E data directory when the config is loaded, before the E2E web servers are spawned; Playwright global setup then removes it again idempotently (Playwright spawns web servers *before* global setup runs); global teardown removes it after the run.

### Documentation maintenance

- Update `docs/architecture/decisions.md` after significant changes (new endpoints, data model, storage, folder structure, dependencies).
- Update the relevant files in `docs/architecture/` (`data-model.md`, `backend.md`, `frontend.md`) when those areas change.
- Also keep the “API endpoints” summary in `docs/architecture/backend.md` (and any linked tables) up to date.
- Build must later update `docs/development.md` with the E2E ports `3101`/`5174` and the rule that Playwright never reuses running local servers; Architect does not edit that file.