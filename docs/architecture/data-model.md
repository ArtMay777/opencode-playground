# Data model

This document describes the data model for the MVP. Domain terms come from `docs/glossary.md`.

## Entities

### Catch record (MVP)

The MVP stores one entity: **Catch record**.

| Field (glossary / API/UI naming context) | Type | Required | Notes |
| --- | --- | --- | --- |
| Catch record ID | string | Yes | Assigned by the API: seed records get `seed-1` through `seed-10` in seed-array order; new records use `crypto.randomUUID()`. Stable for the lifetime of the record; unchanged by edits. |
| Date (`caughtAt`) | string, exact `YYYY-MM-DD` | Yes | Parse numeric year/month/day, construct with `Date.UTC`, require the resulting UTC year/month/day to match the inputs (so `2026-02-30` is invalid); only then reject dates after the server's current UTC calendar date. |
| Angler (`anglerName`) | string | Yes | 1–100 characters after trimming; must contain at least one non-space character after trimming. |
| Fish category (`fishCategory`) | string union `'predatory' \| 'non-predatory'` (not a TypeScript `enum`) | Yes | Must be one of these two values. |
| Fish species (`fishSpecies`) | string | Yes | 1–100 characters after trimming; must contain at least one non-space character after trimming; must belong to the selected Fish category (exhaustive allowed sets come only from `docs/requirements.md` §6; `docs/glossary.md` is terminology/examples only). |
| Fish count (`fishCount`) | integer | Yes | >= 1. |
| Total weight (`totalWeightKg`) | number (kilograms) | Yes | Finite number > 0; “at most two decimal places” means the numeric value is within a small floating-point tolerance of a whole number of hundredths. Exponential JSON notation is accepted by numeric value, so `1e-2` is valid `0.01`. |

Angler and Fish species are trimmed once before validation; `POST` and `PUT` store and return the normalized values.

Only the Catch record ID is unique. Catch records with identical editable values are allowed and stored as separate records (requirements Story 2).

Seed examples live in `data/seed.json` (no IDs in the seed file; IDs `seed-1`…`seed-10` are assigned on initialization in array order).

### Derived: Catch statistics (not stored)

Computed from catch records in view after sorting all loaded records by `caughtAt` descending with `id` ascending for ties and then applying the active Fish category filter (with All selected, all records are in view; otherwise only records matching the selected category):

- Total fish count: sum of `fishCount` (integer). `0` when none.
- Total weight: convert each allowed `totalWeightKg` (at most two decimal places) to integer hundredths before summing; sum those integers; calculate half-up to one decimal from that integer sum; display as `X.Y kg` (e.g. `43.0 kg`). `0.0 kg` when none. Do not sum binary floats or rely on locale-dependent formatting.

## Relations (future-facing, not implemented in MVP)

- `docs/architecture/decisions.md` records that the store may later gain a `fishingTrips` collection and an optional `tripId` on a catch record. Fishing trips/spots and assignment are out of MVP scope.

## Storage representation (summary)

- Persisted as JSON in `store.json`, owned by the API (see `docs/architecture/decisions.md`). Conceptual shape: `{ "catchRecords": CatchRecord[] }`.
- `data/seed.json` is immutable, contains no IDs, and is resolved relative to `import.meta.url`; IDs are assigned when the store is initialized from it.
- `DATA_DIR`, when set, is the directory for the writable `store.json`; otherwise the repository `data/` directory is used. Backend tests use a separate temporary `DATA_DIR` per test, remove it after the test, and call the store module's test-only reset helper between tests; they never read or write the real `data/store.json`.
- `ensureStoreInitialized` is lazy, idempotent, and uses a cached promise before every catch-record route, including when the Express app is imported by Supertest. If the cached promise rejects, the cache is cleared so a later Retry request can initialize again.
- A valid store is an object with a `catchRecords` array; every record has a unique non-empty `id` and valid values for all six editable fields. Invalid or corrupt stored data makes catch-record requests return `500 { "message": "Internal server error" }` with no stack trace.
- Writes use a single in-process promise queue, a temporary sibling file, then rename to `store.json`.
- For API responses, use camelCase keys consistent with the glossary/code mapping in this document (`caughtAt`, `anglerName`, `fishCategory`, `fishSpecies`, `fishCount`, `totalWeightKg`, `id`).