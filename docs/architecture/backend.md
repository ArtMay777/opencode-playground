# Backend (apps/api)

## Responsibilities

- HTTP API under `/api/...` for the Angler Journal MVP: exactly `GET /api/version`, `GET /api/catch-records`, `POST /api/catch-records`, `PUT /api/catch-records/:id`, and `DELETE /api/catch-records/:id`. No other read endpoints (no single-record GET, no stats endpoint).
- Owns persistence in `store.json` (`DATA_DIR` when set, otherwise the repository `data/` directory) — see `docs/architecture/decisions.md` and `docs/architecture/data-model.md`.
- Validates input, enforces business rules from `docs/requirements.md`, returns consistent JSON.

## Structure (MVP guidance)

- Keep `apps/api/src/server.ts` as the app entry: creates/exports Express `app`, wires middleware/routes, starts listening only when run directly (preserves testability).
- Small modular split (no services/repositories layers now): e.g. `src/routes/catchRecords.ts`, `src/store.ts`, `src/validation/catchRecords.ts`, `src/types.ts`. Introduce files only as needed; do not add layers “for later”.
- Relative imports in the API use `.ts` extensions in source as per repo conventions. Use only erasable TypeScript syntax (no `enum`, no `namespace`, no parameter properties).

## API design rules

- All endpoints under `/api`.
- JSON request/response bodies. Use camelCase keys aligned with domain terms (`caughtAt`, `anglerName`, `fishCategory`, `fishSpecies`, `fishCount`, `totalWeightKg`, `id`).
- **Validation:** backend hand-written validation is the source of truth. The rules and the exhaustive Fish species / Fish category mapping come only from `docs/requirements.md` §6; `docs/glossary.md` is terminology and examples only. It returns the exact messages below, which the frontend displays verbatim; no client-authored validation wording.
- **Request contract:** `POST` and `PUT` require a JSON object body with exactly these six fields: `caughtAt`, `anglerName`, `fishCategory`, `fishSpecies`, `fishCount`, `totalWeightKg`. Matching the existing `express.json()` behavior: malformed JSON with a JSON `Content-Type` returns `400 { "field": "body", "message": "Invalid JSON" }`; a missing or non-JSON `Content-Type`, an empty body, `null`, an array, or another non-object body returns `400 { "field": "body", "message": "Invalid request body" }`. An `id` field or any other unknown field returns `400 { "field": "body", "message": "Unexpected field: <field name>" }`; if several unknown fields are present, report the one whose name sorts first by ASCII alphabet. Missing known fields and invalid known fields are checked only after all whole-body checks, in the precedence order below.
- **Normalization:** trim `anglerName` and `fishSpecies` once, before validation; `POST` and `PUT` store and return the normalized values.
- **Validation error field names:** exactly `caughtAt`, `anglerName`, `fishCategory`, `fishSpecies`, `fishCount`, `totalWeightKg`. Whole-body errors use `body`. No other `field` values are returned.
- **Validation precedence:** check in this order and return only the first error:
  1. Malformed JSON with a JSON `Content-Type` → `400 { "field": "body", "message": "Invalid JSON" }`.
  2. Missing or non-JSON `Content-Type`, empty body, `null`, array, or another non-object body → `400 { "field": "body", "message": "Invalid request body" }`.
  3. Any unknown field (including `id`) → `400 { "field": "body", "message": "Unexpected field: <field name>" }`; with several unknown fields, choose the ASCII-alphabetically first name.
  4. Missing known fields → the first missing field in the fixed field order below.
  5. Known-field validation → the first invalid field in this fixed order: `caughtAt`, `anglerName`, `fishCategory`, `fishSpecies`, `fishCount`, `totalWeightKg`. Within `totalWeightKg`, first validate that the value is a finite number greater than 0; only then validate at most two decimal places.
- **Exact validation messages:**

  | `field` | `message` values |
  | --- | --- |
  | `caughtAt` | `Caught at is required`; `Caught at must be a valid date`; `Caught at cannot be in the future` |
  | `anglerName` | `Angler is required`; `Angler must be a string`; `Angler must be 100 characters or fewer` |
  | `fishCategory` | `Fish category must be predatory or non-predatory` |
  | `fishSpecies` | `Fish species is required`; `Fish species must be a string`; `Fish species must be 100 characters or fewer`; `Fish species does not match the selected category` |
  | `fishCount` | `Fish count must be an integer of at least 1` |
  | `totalWeightKg` | `Total weight must be a number greater than 0`; `Total weight can have at most two decimal places` |
  | `body` | `Invalid request body` (missing/non-JSON `Content-Type`, empty body, `null`, array, or another non-object body); `Invalid JSON` (malformed JSON with a JSON `Content-Type`); `Unexpected field: <field name>` (for `id` or any unknown field) |

- Missing known fields use these exact messages: `fishCategory` → `Fish category must be predatory or non-predatory`; `fishCount` → `Fish count must be an integer of at least 1`; `totalWeightKg` → `Total weight must be a number greater than 0`. No additional “required” wording is introduced for these fields.
- **Date validation:** require an exact `YYYY-MM-DD` string; parse numeric year/month/day; construct with `Date.UTC`; require the resulting UTC year/month/day to match the inputs (so `2026-02-30` is invalid); only then compare with the server's current UTC calendar date.
- **Weight validation:** accept finite numbers only. “At most two decimal places” means the numeric value is within a small floating-point tolerance of a whole number of hundredths. Exponential JSON notation is accepted by numeric value, so `1e-2` is valid `0.01`.

- **Error format:**
  - `400` (validation/invalid input): `{ "field": "<field name>", "message": "<exact message from the table above>" }` (UI shows `message` inline for that field; `body` errors are form-level).
  - `404` (missing catch record): `{ "message": "Catch record not found" }`.
  - Unexpected `500`: `{ "message": "Internal server error" }`. A corrupt or unreadable store is handled as this `500`; a missing store is initialized from the seed first. Never leak stack traces.

## Data and storage

- `data/seed.json` is immutable and is resolved relative to `import.meta.url`, so the same path works from `src/` and `dist/`. Never write to it.
- The writable store is `store.json`. When `DATA_DIR` is set, it is the directory containing `store.json`; otherwise the repository `data/` directory is used. Backend tests use a separate temporary `DATA_DIR` per test and remove it after the test, so they never read or write the real `data/store.json`.
- `ensureStoreInitialized` is lazy, idempotent, and uses a cached promise. Call it before every catch-record route, including when the app is imported by Supertest — not only inside the `import.meta.main` startup block. If the cached promise rejects, clear the cache entry so a later Retry request can initialize again.
- The store module exposes a test-only reset helper that clears the initialization cache and the write queue between tests. Production routes must not call it.
- On first use: if `store.json` does not exist, initialize it from `data/seed.json` once. If it exists, validate it before use. A valid store is an object with a `catchRecords` array; every record has a unique non-empty `id` and valid values for all six editable fields. Anything else makes catch-record requests return the safe `500 { "message": "Internal server error" }` with no stack trace; the process must neither crash nor overwrite the bad file.
- IDs: seed records receive `seed-1` through `seed-10` in `data/seed.json` array order; new records use `crypto.randomUUID()`. IDs never change, including after edits.
- All writes go through a single in-process promise queue: write a temporary sibling file, then rename it to `store.json`. Readers never observe a partial file.
- These safeguards (small module split, atomic temp-file rename, write queue, validation on read, future Fishing Trips compatibility) are intentional MVP choices, not over-engineering (see `docs/architecture/decisions.md`).

## API endpoints (MVP)

| Method | Path | Description | Response |
| --- | --- | --- | --- |
| GET | `/api/version` | API name and version | `200 { name, version }` |
| GET | `/api/catch-records` | List all catch records (array) | `200 CatchRecord[]` |
| POST | `/api/catch-records` | Create a catch record (all six editable fields in body) | `201` created `CatchRecord`; `400` validation error shape above |
| PUT | `/api/catch-records/:id` | Replace all six editable fields for the record | `200` updated `CatchRecord`; `400` validation error shape above; `404` `{ "message": "Catch record not found" }` |
| DELETE | `/api/catch-records/:id` | Remove the record | `204` no body; `404` `{ "message": "Catch record not found" }` |

Notes: No `GET /api/catch-records/:id` and no separate stats endpoint in MVP. `GET /api/catch-records` makes no ordering guarantee; the frontend sorts the loaded list (`caughtAt` descending, `id` ascending tie-break), applies the active Fish category filter, and derives both the displayed list and Catch statistics from that filtered list. After a successful `POST`/`PUT`/`DELETE` the frontend refetches `GET /api/catch-records`; a failed mutation leaves the displayed list unchanged.

## Testing

- Vitest + Supertest. Tests live next to code (e.g. `apps/api/src/*.test.ts`). Cover success, invalid input (`400` shape, exact field names and messages), and not-found (`404`) cases, including a multi-field-invalid case that asserts the fixed error order.
- Give each test its own temporary `DATA_DIR`, remove it after the test, and call the test-only store reset helper between tests so no test reads or writes the real `data/store.json`. Cover first-use seeding with `seed-1`…`seed-10`, UUID generation for new records, idempotent initialization, rejected-cache retry, corrupt-store `500`, duplicate identical records (both stored), `id`/unknown-field rejection (including several unknown fields and ASCII-alphabetical selection), malformed JSON with a JSON `Content-Type` (`400 Invalid JSON`), missing/non-JSON `Content-Type`, empty-body, `null`/array/non-object `400 Invalid request body`, the full error-precedence chain (malformed JSON → non-object body → unknown field → missing field → field order), wrong-type messages, missing-field messages for all six fields, invalid calendar dates such as `2026-02-30`, the server UTC today boundary, finite-number/tolerance weight checks including `1e-2`, and malformed JSON with a missing/non-JSON `Content-Type` (handled as `Invalid request body`).
- End-to-end coverage is defined in `docs/architecture/README.md`: one sequential scenario of fresh seed list → filter/statistics → add → edit → delete, replacing the starter smoke assertions. E2E uses a separate temporary `DATA_DIR`, never the real `data/store.json`, and removes it before and after each run.