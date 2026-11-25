# Architecture

This file records **how** the application is built and **why**. Keep it short and up to date: AI agents read it before every task (it is loaded automatically through `opencode.jsonc`), and so will anyone who reviews your project.

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
- One endpoint exists: `GET /api/version` → `{ "name": "api", "version": "0.1.0" }`.
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

## Decisions intentionally left open

These are yours to decide based on your requirements. Choose the simplest option that works, and record the choice below.

- **API design** — resources, URLs, request/response shapes, error format.
- **Backend structure** — when and how to split `server.ts` (routers, modules, validation).
- **Frontend structure** — pages, component folders, routing (whether you need a router at all).
- **State management** — React state and props first; add more only if needed.
- **Validation** — hand-written checks or a validation library.
- **Authentication** — only if your requirements really need it.
- **Deployment vendor** — not chosen; the host must provide a persistent disk/volume for `data/store.json` (see decision log).

## How to document a decision

Add a short entry for every significant decision: new endpoints, data model, storage, dependencies, folder structure. Newest first.

```markdown
### YYYY-MM-DD — Short title

- **Context:** What problem or requirement led to this decision?
- **Decision:** What did you choose?
- **Alternatives:** What else did you consider, and why not?
- **Consequences:** What becomes easier or harder?
```

Also keep the "API endpoints" section up to date.

## API endpoints

| Method | Path | Description | Response |
| --- | --- | --- | --- |
| GET | `/api/version` | API name and version | `200 { name, version }` |

## Decision log

### 2026-11-25 — Writable JSON store owned by the API

- **Context:** Catch records must survive server restarts so an angler can add, edit and delete them over a short deployment. The MVP has no accounts and the production app is one Node.js service.
- **Decision:** The API owns a writable JSON store at `data/store.json`. The frontend reads and changes catch records only through the API. For the MVP the store holds a `catchRecords` collection.
- **Alternatives:** An in-memory array (loses every edit on restart), SQLite or a hosted database (migrations and setup not justified for one small collection), browser `localStorage` (no shared API data and unreliable statistics).
- **Consequences:** No database dependency; writes must be atomic and serialized inside the single process; the directory containing the store must live on persistent storage. Adding a field to a record does not require a schema migration.

### 2026-11-25 — Seed data initializes the store once

- **Context:** `data/seed.json` supplies sample catch records for a fresh install, but edits made after startup must not be silently discarded.
- **Decision:** On startup, when `data/store.json` does not exist, the API reads `data/seed.json` and initializes the store from it once. When the store exists, it is used as-is. `data/seed.json` is immutable and is never written to by the application.
- **Alternatives:** Re-seeding on every boot (erases stored edits), importing the seed at compile time (the API build has `rootDir: "src"`, so a file outside `src` cannot be imported into `dist`).
- **Consequences:** A fresh deployment starts with sample records; removing `data/store.json` resets the journal to the seed; the seed file remains a stable fixture for tests.

### 2026-11-25 — Stable persisted IDs for catch records

- **Context:** Editing and deleting must target one catch record, and the records in `data/seed.json` have no IDs.
- **Decision:** The API creates an ID for every catch record — both records initialized from seed data and records added later — and persists it in `data/store.json`. An assigned ID never changes, including after an edit. The ID format is not fixed by this decision.
- **Alternatives:** Using array positions (break after deletion or reordering), deriving an ID from field values (break when those fields are edited).
- **Consequences:** A client can address a single record for edit and delete; IDs remain valid across restarts; every stored record carries its ID.

### 2026-11-25 — Persistent volume required, hosting vendor undecided

- **Context:** `data/store.json` must survive restarts and redeploys. The starter already runs as one Node.js web service that serves the built frontend and the API on one port.
- **Decision:** No hosting vendor or region is selected now. Any chosen platform must provide a persistent disk/volume for the directory containing `data/store.json` and run the application with `npm run build` followed by `npm start`.
- **Alternatives:** Ephemeral free-tier hosts (the store would be wiped on restart), serverless platforms (require restructuring the long-running Express service and moving storage off disk).
- **Consequences:** Platform choice is narrowed but left open; deployment must include `data/` so seed initialization can work; the same setup runs locally and on the chosen host.

### 2026-11-25 — Fishing trips remain future work

- **Context:** `docs/features/fishing-trips-and-spots.md` plans a Fishing Trip entity and catch records assigned to trips, but the feature is explicitly out of MVP scope.
- **Decision:** The store design allows a later `fishingTrips` collection and an optional `tripId` on a catch record. Fishing trips, fishing spots, and trip assignment are not implemented in the MVP.
- **Alternatives:** Building the relationship now (adds unrequested work to the MVP), using a fixed record shape that cannot accept new fields (would require rewriting stored data later).
- **Consequences:** Adding the collection and optional field later does not invalidate existing catch records; current catch records are unassigned to any trip; API and UI work for trips stays a separate task.
