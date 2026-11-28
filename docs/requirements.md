# Product Requirements

> > **Status:** MVP requirements ready

This file describes **what** your application must do. AI agents read it before planning or implementing anything (it is loaded automatically through `opencode.jsonc`), so clear requirements lead to better code. Write it in English.

Keep **how** it is built (technical decisions) in `docs/architecture/` (see `docs/architecture/README.md` and `docs/architecture/decisions.md`).

## How to write good requirements

- **Define a small but complete MVP** (minimum viable product): the smallest version of your idea that a real user could use from start to finish. Example size: 3–6 user stories.
- **Be specific and observable.** "The user sees an error message when the title is empty" is testable; "the form is user-friendly" is not.
- **Write down what is out of scope.** It stops you (and the AI) from building extra features.
- **Update this file when you change your mind**, before asking an agent to implement the change.
- Ask an AI agent to help you write and critique this file, but make the final decisions yourself.

---

## 1. Product overview

Angler Journal is a web application for recording fishing catches. It helps amateur anglers keep a history of their catches, filter records by fish category, and review their total fish count and weight.

## 2. Users

Amateur anglers who want to record and review their fishing catches.

## 3. User stories

1. As an amateur angler, I want to view all catch records so that I can review my fishing history.
2. As an amateur angler, I want to add a catch record with its date, my name, fish category, fish species, count, and total weight so that I can save my result.
3. As an amateur angler, I want to edit or delete a catch record so that I can correct mistakes or remove an accidental entry.
4. As an amateur angler, I want to filter catch records by fish category so that I can focus on predatory or non-predatory fish.
5. As an amateur angler, I want to view catch statistics so that I can see my total fish count and total weight.

## 4. Scope

### In scope (MVP)

- Display a list of catch records.
- Add a catch record with a date, angler name, fish category, fish species, fish count, and total weight.
- Edit or delete an existing catch record.
- Filter catch records by fish category.
- Display total fish count and total weight.

### Out of scope

- User accounts, registration, and authentication.
- [Fishing trips and fishing spot tracking](features/fishing-trips-and-spots.md).
- Catch photos.
- Weather forecasts or external weather APIs.
- Automatic fishing predictions or recommendations.
- Sharing records between users or a mobile application.

## 5. Acceptance criteria

### Story 1 — View all catch records

- Given catch records are loading, when the angler opens Angler Journal, then a brief loading message is shown while the data is fetched.
- Given the 10 catch records from `data/seed.json` are loaded, when the angler opens Angler Journal, then all 10 catch records are listed with their Date, Angler, Fish category, Fish species, Fish count, and Total weight (displayed with one decimal place and “ kg”), ordered by Date descending; if Date is equal, ordered by Catch record ID ascending. Catch record IDs are not shown as a user-facing field.
- Given loading catch records fails because the API is unreachable or the stored data is invalid, when the angler opens Angler Journal, then the message “Could not load catch records” is shown with a Retry button. Selecting Retry attempts to load catch records again.
- Given no catch records exist, when the angler opens Angler Journal, then the message "No catch records yet" is shown instead of a list.

### Story 2 — Add a catch record

- Given valid values (Date `2026-04-12`, Angler "Oleksii", Fish category `predatory`, Fish species "pike", Fish count 2, Total weight 3.4), when the angler submits the form, then a new catch record with those values appears in the list in the defined order and catch statistics increase by 2 fish and 3.4 kg. Leading and trailing spaces in Angler and Fish species are trimmed before validation and storage; if trimming makes either value empty, the submission is invalid.
- Given a catch record with identical values in all fields (after trimming for Angler and Fish species) already exists, when the angler submits the same values again, then both catch records are listed.
- Given a required field is empty, or Angler or Fish species is empty after trimming (including when it contains only spaces), when the angler submits the form, then an inline error shows the API message for that field, no catch record is added, and the API responds with HTTP 400 JSON `{ "field": "<field name>", "message": "<human-readable explanation>" }`.
- Given Angler or Fish species is longer than 100 characters, when the angler submits the form, then an inline error shows the API message for that field, no catch record is added, and the API responds with HTTP 400 JSON `{ "field": "<field name>", "message": "<human-readable explanation>" }`.
- Given Fish species "perch" with Fish category `non-predatory`, when the angler submits the form, then an inline error shows the API message for Fish species, no catch record is added, and the API responds with HTTP 400 JSON `{ "field": "<field name>", "message": "<human-readable explanation>" }`.
- Given Fish count 0 or a non-integer, Total weight 0, a negative value, or more than two decimal places, or a Date that is not a real `YYYY-MM-DD` date or is in the future (rejected using the server’s current UTC calendar date), when the angler submits the form, then an inline error shows the API message for that field, no catch record is added, and the API responds with HTTP 400 JSON `{ "field": "<field name>", "message": "<human-readable explanation>" }`.
- Given a Fish category filter is active and the new catch record’s Fish category does not match that filter, when the angler submits valid values, then the catch record is saved successfully but is not shown in the current filtered list; catch statistics continue to reflect only the active filter until the filter changes.

### Story 3 — Edit or delete a catch record

- Given a catch record, when the angler opens its edit form, then the editable fields (Date, Angler, Fish category, Fish species, Fish count, Total weight) are prefilled with that catch record’s current values. The Catch record ID is never shown and cannot be edited.
- Given a catch record, when the angler changes any editable field to valid values (leading and trailing spaces in Angler and Fish species are trimmed before validation and storage; trimming to empty is invalid) — including a different Fish category with a matching Fish species — and saves, then only that catch record is updated, and the list and catch statistics update immediately. The API identifies the record by its Catch record ID.
- Given a catch record, when the angler saves an invalid value (for example Fish count 0, Total weight 0 or more than two decimal places, or a Date in the future rejected by the server’s current UTC calendar date), then an inline error shows the API message for that field, that catch record remains unchanged, and the API responds with HTTP 400 JSON `{ "field": "<field name>", "message": "<human-readable explanation>" }`.
- Given a catch record, when the angler chooses to delete it and confirms, then that catch record is removed (deleted via the API by its Catch record ID), other catch records are unchanged, and the list and catch statistics update immediately.
- Given a catch record, when the angler chooses to delete it and cancels the confirmation, then no catch record is removed.
- Given only one catch record remains, when the angler deletes it and confirms, then "No catch records yet" is shown and catch statistics show 0 fish and 0.0 kg.
- Given a Fish category filter is active and the edited catch record’s Fish category no longer matches that filter, when the angler saves valid changes, then the catch record is updated successfully but is not shown in the current filtered list; catch statistics continue to reflect only the active filter until the filter changes.

### Story 4 — Filter catch records by fish category

- Given the 10 catch records from `data/seed.json` are loaded and no Fish category filter is active (All is selected by default after a page reload), when the angler uses the Fish category filter dropdown to select Predatory, then only the five predatory catch records are listed and catch statistics show 20 fish and 14.3 kg.
- Given the 10 catch records from `data/seed.json` are loaded, when the angler uses the Fish category filter dropdown to select Non-predatory, then only the five non-predatory catch records are listed and catch statistics show 24 fish and 28.7 kg.
- Given an active Fish category filter, when the angler selects All in the Fish category filter dropdown, then all catch records are listed and catch statistics cover all catch records. No filter persistence is required across page reloads (All is selected after reload).
- Given no catch record has the selected Fish category, when that filter is applied, then "No records in this fish category" is shown and catch statistics show 0 fish and 0.0 kg.

### Story 5 — View catch statistics

- Given the 10 catch records from `data/seed.json` and no Fish category filter, when the angler views catch statistics, then total fish count is 44 and total weight is shown as 43.0 kg.
- Given an active Fish category filter, when the angler views catch statistics, then the totals cover only the catch records matching that filter.
- Given catch records whose Total weight sums to 3.46 kg, when the angler views catch statistics, then total weight is shown as 3.5 kg.
- Given no catch records, or no catch records matching the active Fish category filter, when the angler views catch statistics, then 0 fish and 0.0 kg are shown.
- Given a catch record is added, edited, or deleted, when the change is saved, then catch statistics update immediately.

## 6. Data

### Catch record

The MVP stores one entity: Catch record. The 10 examples in `data/seed.json` use these fields, except for Catch record ID, which the API assigns when it initializes the store from the seed data.

| Field | Type | Required | Validation rules |
| --- | --- | --- | --- |
| Catch record ID | string | Yes | Assigned by the API when a catch record is created, including for records initialized from seed data; stable for the lifetime of the catch record and unchanged by edits. |
| Date | string in `YYYY-MM-DD` format | Yes | A real calendar date, never in the future. |
| Angler | string | Yes | 1–100 characters; must contain at least one non-space character. |
| Fish category | string: `predatory` or `non-predatory` | Yes | Must be one of these two values. |
| Fish species | string | Yes | 1–100 characters; must contain at least one non-space character; must belong to the selected Fish category: `predatory` — pike, perch, zander; `non-predatory` — crucian carp, carp, bream, silver carp. |
| Fish count | integer | Yes | Greater than or equal to 1. |
| Total weight | number, kilograms | Yes | Greater than 0 with at most two decimal places. |

### Catch statistics (derived, not stored)

| Value | Type | Derivation |
| --- | --- | --- |
| Total fish count | integer | Sum of Fish count over the catch records in view; 0 when there are none. |
| Total weight | number, kilograms | Sum of Total weight over the catch records in view, rounded to one decimal place using half-up rounding; shown as a number with one decimal place and “ kg” (for example 43.0 kg). If there are no catch records in view, shown as 0.0 kg. |

The catch records in view are all catch records when no Fish category filter is active, and only catch records with the selected Fish category otherwise.

There is no Angler entity: the MVP identifies an Angler by name only. Fishing trips and fishing spots are out of scope for the MVP.

## 7. Open questions

There are no unresolved user-facing MVP questions. API route design and component layout will be decided later during architecture and implementation.
