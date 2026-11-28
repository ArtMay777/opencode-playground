# Frontend (apps/web)

## Responsibilities

- React UI for Angler Journal MVP: view/add/edit/delete catch records, filter by Fish category, show catch statistics, handle loading/error/empty states per `docs/requirements.md`.
- Calls the backend only via relative `/api/...` URLs (proxied in dev; same origin in prod).

## Structure (MVP)

- Use `src/components/`, `src/api.ts`, `src/types.ts`, and `src/utils/` only when a reusable helper is needed. `src/api.ts` is the agreed API helper location. No router, state libraries, UI kits, or new dependencies for the MVP.
- `src/main.tsx` renders `src/App.tsx`; Tailwind via `src/index.css`. Keep files readable; extract components into `src/components/` as needed.
- API helpers live in `src/api.ts` with explicit TypeScript types for requests/responses.

## UI rules

- Function components and hooks, TypeScript strict. Use one controlled form (`useState`) in Add mode or Edit mode; do not maintain separate add and edit forms.
- Single screen: selecting Edit sets the selected catch record and pre-fills all six editable fields (Date, Angler, Fish category, Fish species, Fish count, Total weight). The Catch record ID is never shown or editable. Delete uses `window.confirm("Delete this catch record?")`; only a confirmed deletion calls `DELETE` (cancel makes no API call).
- Do not use browser validation that prevents form submission: forms use `noValidate` / no submission-blocking native `required` validation. The backend receives the request and returns the required inline API field error.
- Data pipeline, in exactly this order: sort all loaded catch records by `caughtAt` descending, with `id` ascending for ties; apply the active Fish category filter; derive both the displayed list and Catch statistics from that filtered list. The API does not promise an order.
- While loading, show `Loading catch records...`. A failed load shows `Could not load catch records` with a Retry button that re-runs the load.
- Empty states: with All selected (no active category filter) and an empty loaded list, show “No catch records yet”; with Predatory or Non-predatory selected and no matches, show “No records in this fish category”.
- Fish category filter is a dropdown with exactly All, Predatory, and Non-predatory. All is selected after a page reload; filter persistence is not required.
- The list columns, in order, are Date, Angler, Fish category, Fish species, Fish count, Total weight, and Actions, using the glossary terms for the six data columns. `Actions` is a generic UI label, not a domain glossary term. Display Date exactly as `YYYY-MM-DD`; display Fish category as `Predatory` or `Non-predatory`. Catch record IDs are not displayed. The API/data property remains `caughtAt`.
- The Actions column holds an `Edit` button and a `Delete` button for each catch record. Their visible labels are `Edit` and `Delete`; their accessible names are `Edit <fishSpecies> caught on <caughtAt>, record <n>` and `Delete <fishSpecies> caught on <caughtAt>, record <n>`, substituting that record's values, where `<n>` is the 1-based ordinal position of the row in the currently displayed (sorted and filtered) list. Each row has `data-testid="catch-record-<id>"` for tests only; the Catch record ID is never visually displayed.
- Show Catch statistics above the list, labeled `Total fish count` and `Total weight`.
- After a successful Add or Edit, return to empty Add mode (clear the form and the selected catch record). Cancel Edit returns to Add mode without changing any data. After a successful Delete, if the deleted catch record is the one currently being edited, reset to empty Add mode; deleting any other record preserves the current edit form.
- Visible form button labels are `Add catch record` in Add mode, `Save changes` in Edit mode, and `Cancel` when editing.
- Tailwind utility classes; responsive-first (`sm:`/`md:` as needed).
- Accessibility: semantic HTML, labeled form fields, keyboard usable, async status via `role="status"` or `aria-live` where appropriate.
- Use domain terms from `docs/glossary.md` in UI text.

## Exact UI messages

Use these strings verbatim; do not invent alternatives.

| Situation | Message |
| --- | --- |
| Loading catch records | `Loading catch records...` |
| Load failure (`API unreachable`, invalid stored data, or a failed refetch after a successful mutation) | `Could not load catch records` with a `Retry` button |
| No records and no active filter | `No catch records yet` |
| No records matching an active category filter | `No records in this fish category` |
| Delete confirmation | `Delete this catch record?` |
| `404` form message on edit/delete | `Catch record not found` |
| Create/update network or `500` failure | `Could not save catch record. Please try again.` |
| Delete network or `500` failure | `Could not delete catch record. Please try again.` |
| `400` validation failure | API `message` verbatim — inline for field errors, form-level for `body` |

## API integration

- Call the backend only from `src/api.ts` using relative URLs (`fetch('/api/...')`).
- Backend is source of truth for validation. Display API `400` field errors verbatim, inline for the exact field names `caughtAt`, `anglerName`, `fishCategory`, `fishSpecies`, `fishCount`, `totalWeightKg`; `field: "body"` is shown verbatim as a form-level message.
- MVP flow: load via `GET /api/catch-records`; then follow the data pipeline in the UI rules (sort → apply Fish category filter → derive the displayed list and Catch statistics from the filtered list). No optimistic updates.
- Mutation failure UI: a `400` shows the API message inline for its field; a `404` shows `Catch record not found` as a form-level message; create/update network or `500` failures show `Could not save catch record. Please try again.`; delete network or `500` failures show `Could not delete catch record. Please try again.`. Keep the currently displayed list unchanged until the mutation succeeds; after success, refetch the full list with `GET /api/catch-records`. If that follow-up `GET` fails, show `Could not load catch records` with Retry, keep the last rendered list and Catch statistics visible, and never automatically repeat the successful mutation.
- **Reuse:** one helper in `src/utils/` calculates Catch statistics and formats total weight. Convert each allowed weight to integer hundredths before summing; calculate half-up to one decimal from that integer sum, then format as `X.Y kg`. Both the Catch statistics `Total weight` value and every Total weight column value use this same reusable one-decimal weight-format helper. Do not duplicate this logic across components.

## Testing

- Vitest + React Testing Library. Tests next to components (`*.test.tsx`). Query by role/label/text. Mock `fetch` with `vi.stubGlobal` (see existing `App.test.tsx` patterns). Test loading, success, error paths for API-backed behavior.
- Cover sorting with an equal-`caughtAt` tie, all exact UI messages in the table above, edit prefill, delete confirm/cancel, submission reaching the API despite empty fields, inline `400` messages displayed verbatim, form-level `404`/`500`/network errors, unchanged list on failed mutation, refetch after success, refetch failure after a successful mutation (message + Retry, last rendered list/statistics retained, no repeated mutation), integer-hundredth half-up formatting, filter dropdown/default, list columns (including Actions), row action labels, ordinal accessible names and row test ids, Add/Save/Cancel button labels, exact `YYYY-MM-DD` Date and `Predatory`/`Non-predatory` category display, duplicate records, Catch statistics placement/labels, Add/Edit/Cancel form state transitions, and the two Delete form-state rules (current edit vs. another record).
- The end-to-end scenario (Playwright, temporary `DATA_DIR`) is defined in `docs/architecture/README.md`: one sequential run of fresh seed list → filter/statistics → add → edit → delete, replacing the starter smoke assertions.