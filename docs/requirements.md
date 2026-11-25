# Product Requirements

> **Status:** draft

This file describes **what** your application must do. AI agents read it before planning or implementing anything (it is loaded automatically through `opencode.jsonc`), so clear requirements lead to better code. Write it in English.

Keep **how** it is built (technical decisions) in `docs/architecture.md`.

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

<!--
For each user story, list checks that prove it works. They become your tests.

Story 1:
- Given ..., when ..., then ...
- ...
-->

## 6. Data

<!--
What information does the application store or show? List the main entities and their fields.
Example: Task — title (required, max 100 characters), due date (optional), done (true/false).
Where the data is stored is an architecture decision: see docs/architecture.md.
-->

## 7. Open questions

<!-- Things you have not decided yet. -->
