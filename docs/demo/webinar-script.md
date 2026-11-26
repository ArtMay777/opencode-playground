# Webinar script: AI-first full-stack development

Presenter notes for the two-day webinar, written down **after** it was held — what was planned, what really happened, and what to keep for next time. Not part of the student guide: Step 9 removes this folder from student projects.

The example project is **BookCast** — a catalog of books about AI, built like a film database (works, editions, a cast of authors, translators, editors). Repo: [opencode-quicktest](https://github.com/alexander-ignatow/opencode-quicktest).

**Real format:** 2 days × 90 minutes, each day ran about 15 minutes longer because of questions.

| Day | Prerequisite (done before) | Live | Explained |
| --- | --- | --- | --- |
| 1 | Guide Steps 1–3 | Step 4 — requirements | AI-assisted development in general; why tests and docs matter and must be maintained like code |
| 2 | Day 1 result + Step 5 (architecture) + the first story | Step 6 — one story | Code generation; the plan → implement → verify cycle |

Steps 7–9 are self-study; 7 (feature) and 8 (deploy) are optional.

## 0. Show the project structure — the template is a recommendation

Open the repository tree and walk through it top-down:

- `apps/web`, `apps/api`, `e2e/` — working React + Express app with tests, no product features.
- `docs/` — `requirements.md`, `architecture.md`, `glossary.md`, `features/`, `development.md`, `guide/` (and `demo/` here).
- `data/seed.json` — sample data.
- `.opencode/` — agents (`analyst`, `frontend`, `backend`, `reviewer`) and commands (`/plan-feature`, `/implement`, `/verify`); `AGENTS.md` and `opencode.jsonc` — rules and permissions every agent gets.
- `render.yaml`, `.env.example` — deploy scheme and the list of secrets.

Messages:

- **In the template, agents refer to files that do not exist yet** (`docs/features/`, `data/seed.json`, a filled `glossary.md`, `.env`). They appear step by step while you follow the guide. An empty file is a placeholder for a decision you have not made yet.
- **The template is my recommendation, not a rule.** Example: the seed does not have to be a JSON file — it can be instructions on where to get the data, or a database dump. Requirements could live in GitHub issues instead of a Markdown file.
- **Any file of the template can — and sometimes must — be changed for your project:** rules in `AGENTS.md`, agents and their permissions, commands, the docs structure.
- **This repo already differs from the template, and that is normal:** the moment a project starts, it goes its own way (BookCast glossary, deploy scheme, architecture decisions).
- **That is why there is no single "correct" template for an AI-assisted project today.** It depends on the domain, the architecture, the requirements and the team.

## 1. Explain the assignment

Open the template README and walk through the guide. Message: every step ends with a concrete, checkable result, and each result is the input for the next step.

1. **Setup** — create a repo with **Use this template**, install, run the app and tests, connect OpenCode with a free model.
   - Result: the app runs, tests pass, the agent answers the first prompt.
   - Webinar: done before Day 1, shown.
2. **Idea and scope** — in any AI chat: pick a unique idea, cut an MVP, plan the next feature, write a glossary and sample data.
   - Result: brief in `docs/requirements.md`, `docs/glossary.md`, `docs/features/<name>.md`, `data/seed.json`.
   - Webinar: done before Day 1, shown (BookCast).
   - What collecting the sample data taught us:
     1. ISBN is not a silver bullet: it exists only since about 1970, so older editions have none. ISBN cannot be the identity of an edition.
     2. Author uniqueness is an open question: how do we avoid duplicates ("A. C. Clarke" vs "Arthur C. Clarke", transliterations)?
     3. The cast needs non-standard roles. In practice the whole cast became optional — only the author is required.
3. **Data, key decisions and hosting** — from here on the work happens in OpenCode. Storage, seeding, decisions the next feature depends on, hosting; connect the database.
   - Result: decision log in `docs/architecture.md`, `.env` + `.env.example`, optionally `render.yaml`.
   - Webinar: done before Day 1, shown.
4. **Requirements** — the **analyst** agent asks questions, then writes acceptance criteria and data; a second session reviews them as QA; the analyst fixes the findings.
   - Result: complete, testable `docs/requirements.md`.
   - Webinar: **Day 1, live.**
5. **Architecture** — an `architect` agent, `docs/architecture/` folder, data model, code structure and libraries; review in a fresh session.
   - Result: `docs/architecture/` (README, data model, backend, frontend, decisions), `architect` agent.
   - Webinar: done at home before Day 2, shown.
6. **Build the MVP** — first the data model in code and the seed, then story by story: `/plan-feature` → `/implement` → browser → `/verify` → commit.
   - Result: working MVP, green checks, e2e test for the main flow.
   - Webinar: first story done at home; **Day 2, one story live.**
7. **Add a feature** *(optional)* — docs first, then the same loop on an existing system.
   - Webinar: self-study.
8. **Deploy** *(optional)* — production build locally, then a free web service.
   - Webinar: self-study; `render.yaml` shown.
9. **Portfolio** — README about your app, screenshot, remove the guide and these notes, polish the repo.
   - Webinar: self-study.

## 2. Prerequisites

### Starting point

- **Day 1** starts from `master` with guide Steps 1–3 **done**. I do not repeat them live: I show their results (section 3).
- **Day 2** starts from the Day 1 result **plus Step 5 (architecture) and the first story** done at home.

Before going live: `git switch -c demo/day1 master` (Day 2: a branch from the prepared state).

### Repositories

| Repo | Role |
| --- | --- |
| [opencode-playground](https://github.com/alexander-ignatow/opencode-playground) | Template for students (`master`). Guide in `docs/guide`. |
| [opencode-quicktest](https://github.com/alexander-ignatow/opencode-quicktest) | This demo app, created from the template with **Use this template**. Students get read access. |

### Branches in this repo

No tags — a branch from `master` is enough.

| Branch | Purpose |
| --- | --- |
| `master` | Stable branch, deployed by Render. The **starting point**: Steps 1–3 done. |
| `demo/day1`, `demo/day2` | Live demo branches, cut from `master` (Day 2: from the Day 1 result). Throwaway. |
| prepared branch | Result prepared at home (Day 2: Step 5 + first story). **Fallback:** if the model hits a limit or gets stuck on air, switch to it and show the result. |
| `feature/<name>` | The flow the guide teaches: one branch per story, merged with a pull request. |

### Accounts and services

| Service | What is set up | Notes |
| --- | --- | --- |
| GitHub | Both repos, public | Students fork nothing; they use the template |
| OpenCode Zen | Connected via `/connect` | Free models used in rehearsal: DeepSeek V4.1 Flash Free (hit its limit in Step 5), **Big Pickle** (finished Step 5). Keep at least two ready. |
| Neon | Postgres, project created | Database branch `main` for the deployed `master`; `demo` for local work, demo branches and feature branches — so experiments never touch the deployed data |
| Render | Prepared, **not deployed** | `render.yaml` describes one free web service that deploys `master`. Deploying is optional for the demo. |

### Local environment

| Item | Value |
| --- | --- |
| OS | macOS |
| Node.js | 24 (current). A guideline: take the current LTS, minimum 22.18. |
| OpenCode | Latest version (`opencode --version`) |
| Editor | Any |
| `.env` | Present locally with `DATABASE_URL` for the **demo** database branch. Never shown on screen. |

> Versions and the model are guidelines, not requirements. The list of free models and their limits changes regularly: pick the model right before you start working. DeepSeek V4.1 Flash Free and Big Pickle are simply what worked for this example in November 2026. The free limit may be shared between free models (per account or IP): switching models does not always help.

### Pre-flight checklist (before each webinar day)

- [ ] `git fetch --all`, demo branch cut from the right point, working tree clean.
- [ ] `npm install` done, `npm run dev` works, Playwright browser installed (`npm run test:e2e:install`).
- [ ] OpenCode started from the repo root, provider connected, model selected, a test prompt answered.
- [ ] Free model checked today (`/models`); a backup free model chosen. **No long runs on the same model right before going live** — do not burn the limit.
- [ ] Neon dashboard open in a browser tab (and Render, if `master` is deployed — open its URL a minute before, it sleeps).
- [ ] Fallback branch fetched locally and checked (see section 6).
- [ ] Screen: terminal + editor + browser layout, large font, notifications off, no secrets visible.

## 3. Steps 1–3: what students do (done before the demo)

For each step: what a student does, what it produces, and what I open on screen to show it.

### Step 1. Setup

- Student: **Use this template** → clone → `npm install` → `npm run dev` → `npm run test` / `npm run test:e2e` → install OpenCode → `/connect` (OpenCode Zen) → `/models` (a free model) → first prompt from guide 1.8.
- Result: the app shows "Connected to api v0.1.0", tests are green, the agent summarized the project without changing files.
- Show: the starter page in the browser, the repo tree (`apps/`, `docs/`, `.opencode/`, `AGENTS.md`), one agent file and one command file — "this is what the agent knows". Point at `.opencode/agents/analyst.md`: an agent with its own role and its own permissions — we will use it live in Step 4.

### Step 2. Idea and scope (any AI chat)

- Student: brainstorm ideas from personal interests → pick one → cut an MVP → define the next feature → write a glossary → ask for sample data as human-readable JSON.
- Result: brief in `docs/requirements.md` (sections 1–4), `docs/glossary.md`, `docs/features/<name>.md`, `data/seed.json`.
- Show:
  - `docs/requirements.md` — BookCast: works vs editions, the cast, guest and curator, one creation flow through the edition.
  - `docs/glossary.md` — work vs edition, credit role vs user role, editor vs curator. Free models are weak: without this file they *will* mix these up on screen. Every agent reads it before every task (`opencode.jsonc`).
  - `docs/features/my-library.md` — planned *now* and never built in the demo, but it already changed the architecture (users with a *set* of roles).
  - `data/seed.json` — books about AI: a work in many editions and translations, collections, editions without ISBN, a rich Ukrainian cast (Нейромант 2017).
- Talking points: the three lessons from collecting data (section 1, Step 2).

### Step 3. Data, key decisions and hosting (OpenCode starts here)

- Student: in OpenCode, the **plan** agent compares storage and hosting options for *their* requirements and names the decisions the next feature depends on → the **build** agent records them in `docs/architecture.md` → Neon project and `.env` → `.env.example` committed.
- Result: decision log in `docs/architecture.md`, `.env` (local only), `.env.example`, optionally `render.yaml`.
- Show:
  - `docs/architecture.md` decision log: Neon Postgres (database branches `main` and `demo`), Drizzle, seeding through the create-edition logic, users with a **set** of roles, cookie sessions, images as links, one Render service.
  - The roles decision as the key example: made now because of the planned feature, costs nothing in the MVP.
  - `.env.example` and `git status` — `.env` is not in git. Never open `.env` on screen.
  - `render.yaml` — the deploy scheme in one file: `master` is deployed, work happens in feature branches.
- Note: a student needs the agent here to understand the options; I skip this dialogue because I already know what I want.

## 4. Day 1 (90 min)

**Prerequisite:** guide Steps 1–3 done.

| Block | What happened |
| --- | --- |
| Intro: what AI-assisted development is | The idea of the whole webinar: code generation is the smaller part, stability and repeatability are the main part |
| Template and project (sections 0–1, 3) | Project structure, "the template is a recommendation", BookCast, results of Steps 1–3 |
| **Step 4 live** — requirements, three prompts | ~15–20 min on a free model |
| Questions | Took a lot of time and energy |

### Step 4. Requirements (live): three prompts

1. **Analyst completes the requirements** — switch to `analyst`, prompt from guide 4.1. It asks questions first; I answer; it writes acceptance criteria, data and open questions, and updates the glossary.
2. **QA review in a fresh session** — `/new`, switch to `plan`, prompt from guide 4.2. It lists vague or untestable criteria and contradictions.
3. **Analyst fixes the findings** — back to `analyst`: "Fix findings N, M from the review; leave K as is." Show `git diff docs/requirements.md`.

Message: the model made the mistakes, and the model found them — because the *process* has a review in a fresh session, not because the model is smart.

### What we learned on Day 1

- Only Step 4 fit into the live part. Planned were Steps 4 and 5 — too much for one session with a slow free model and questions.
- Most of the energy went into explaining **why tests and documentation matter and must be maintained like code**. The students had little hands-on experience yet, and the talk was already breaking their paradigm. Next time: show the *why* on a concrete failure (the model mixing up terms, a review that catches an error) instead of explaining it in advance.

### Homework after Day 1

- Steps 1–4 (better 1–5) on **your own** project — then the Day 2 questions are about your projects.
- Expect free model limits: spread the work over several days, `/new` for every task, small prompts.

## 5. Day 2 (90 min)

**Prerequisite:** the Day 1 result + Step 5 (architecture) + the **first story done at home**.

Why the first story at home: it is the riskiest one — it turns the data model into a schema, migrations and the seed (`db:seed`), and all setup problems show up there. The second story goes much smoother and is the one to show live.

| Block | What happened |
| --- | --- |
| Recap: requirements and architecture (`analyst`, `architect`, `docs/architecture/`, `decisions.md`) | Short |
| How code generation works: plan agent, build agent, subagents, review | Explained |
| **Step 6 live** — one story | The free DeepSeek ran out **before one story was finished** |
| Questions + the plan → implement → verify cycle | The cycle (guide Step 6) worked very well as an explanation |

### Step 6. Build the MVP (live: one story)

For the story:

1. `/new`, `/plan-feature <story>` — the plan agent plans against `docs/architecture/`.
2. Review the plan aloud: does it contradict the architecture? (A new library or another folder layout → stop, back to the architect.)
3. `/implement`, step by step. Point at the screen when `build` hands work to the `backend` / `frontend` subagents.
4. Check in the browser myself.
5. `/verify` — real PASS/FAIL table and the reviewer's findings.
6. Commit.

While reading the agent's output: name 1–2 weak spots aloud, do not fight the model live.

**Deliberate gap: visual design.** Nothing in the guide, requirements or architecture describes how the app should *look*. The UI approach (library or none, component reuse) is architecture and is decided; the look is not. Show what a weak model produces without a design brief.

### The honest limit of free models

Say it plainly: free models are enough to learn the process. For serious work — buy a subscription or use your own API key. The free DeepSeek ate its limit in 5–7 prompts and did not finish one story. Orchestration with several subagents costs even more requests: every subagent starts with a fresh context and reads the docs again.

### The planned feature

Not built: implementing a story *is* implementing a feature. But `my-library.md`, planned in Step 2, made us choose users with a *set* of roles — planned, not built, and it still shaped the architecture.

### Bonus at the end of Day 2

1. **Pull request on GitHub + review by Copilot.** It found some of the same problems as our `reviewer` and a couple of new ones. Good practice: review the agent's work with a **different model or a different harness** — they have different blind spots.
2. **Design by Claude Code.** The project had no visual brief, so the UI was basic (the deliberate gap). From a couple of prompts based on the requirements, Claude Code produced a decent design and a prototype — take it and apply it to the app. The gap a weak model leaves is exactly where a stronger tool pays off.

## 6. Fallback

No tags. One prepared branch per day with the result done at home. If the model hits a limit or gets stuck live: switch to it, show the result, explain what the model would have done. Keep a second free model ready (in rehearsal: DeepSeek V4.1 Flash Free ran out, **Big Pickle** finished the work) — but the limit may be shared between free models.

## 7. Run log

- **Rehearsal, Step 4, DeepSeek V4.1 Flash Free.** Slow, stumbles in places. The analyst introduced errors; the QA review found them; a third prompt fixed them. 15–20 min.
- **Rehearsal, Step 5, DeepSeek → Big Pickle.** DeepSeek hit the free limit in the middle of the architecture ("continue in 1.5 hours or pay $10"). Big Pickle finished it: the process survived the model switch because everything lives in files, not in the model's memory.
- **Rehearsal, seed.** Generated right after the architecture: a good seed script and about half of the data model in code. → Guide 6.2 now starts the MVP with "data model in code + seed".
- **Day 1.** Only Step 4 live. Questions took a lot of time; explaining why tests and docs matter was hard for students without experience.
- **Day 2.** Step 5 and the first story prepared at home, one story live. The free model ran out before the story was done. The cycle explanation (Step 6) landed well.
- **Both days** ran ~15 minutes over the 90 minutes because of questions.

## 8. Key messages (for slides / cheat sheet)

- **Code generation is the smaller part of the work.** The main part is making the result stable, reliable and repeatable — that is what architecture, documentation, tests and agent settings are for. This is the difference between real AI-assisted development and "vibe coding".
- Every step ends with a concrete, checkable result, and that result is the input for the next step.
- Product first, code later: idea, scope, next feature, glossary and sample data come before any code.
- Plan the next feature together with the MVP: the architecture must not block it, but do not build it in advance (example: users with a *set* of roles).
- Sample data is the best test of the data model: if you cannot write 10–20 realistic records, the model is not ready.
- Collecting real data teaches things no brainstorm does: ISBN is not an identity, duplicates of people are a real problem, the cast needs non-standard roles.
- Free models are weak at similar words: a glossary in a separate file, read by every agent, prevents mixing up concepts.
- Give an agent a role **and** permissions: the analyst can edit only docs, so it cannot drift into code.
- Small steps + a check after every step: plan → implement → verify → understand → commit.
- Never trust "all tests passed" without seeing the output.
- Agree on the architecture before the first story: with one loose file it drifts before any code exists. Decide data model, structure and libraries once, write them down, let every agent read them.
- An agent is a role, not a model: one weak model with three narrow roles (analyst, architect, builder) works better than one model with one vague prompt.
- Whatever you do not describe, the model invents. Visual design is the most visible example: no design brief — and you get the weak model's default look.
- Mistakes are expected, the process catches them: in rehearsal the analyst made errors in the requirements and a review in a fresh session found them.
- The template is a starting point. Change it for your project — there is no single right AI-assisted setup.
- Free has a price — limits. A model ran out mid-step: switch to another one and continue from the files. Save requests: short context, `/new` for every task, small steps.
- Plan a feature without building it: `my-library.md` was never implemented, but it shaped the architecture (users with a set of roles).
- Free is enough to learn the process; for serious work, pay. A free model ate its limit in 5–7 prompts.
- Tests and documentation are part of the code: they are maintained like code, or they rot like code.
- The first story is the riskiest (schema, migrations, seed, setup). Do it with patience — the next ones go much smoother.
- Teaching note: show the *why* on a real failure before explaining the paradigm — explanations without experience do not stick.
- Review with a different model or harness (for example Copilot on the pull request): it finds part of the same problems and new ones — different blind spots.
- Use the right tool for the job: a free model builds the working flow; a stronger tool can produce a decent design and prototype from the requirements in a couple of prompts.

## 9. Next time

- Plan one live step per day; prepare the rest at home and show the result.
- Day 1: Steps 1–3 shown, Step 4 live. Day 2: Step 5 + first story prepared, one story live.
- Budget 90 minutes plus ~15 for questions, or collect questions in advance.
- Keep two free models ready and do not burn the limit right before going live.
- Show the value of tests and docs on a concrete failure, not in a lecture.
- Keep the bonus: PR review by another model and a design prototype from a stronger tool — both landed well.
