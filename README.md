# AI Planner (UON Tool)

A web application that helps students plan their coursework and track degree progress. All source code lives in [unlu-tool/](unlu-tool/).

## What it is

An academic advising / degree-planning portal made of a plain HTML/CSS/JS frontend and a Node.js + SQLite backend. Students log in with their student ID, review their progress toward graduation (core, major, and elective requirement blocks, plus course-level rules), record completed/in-progress courses, auto-generate a semester-by-semester study plan, save multiple plan versions, and adjust plans through a natural-language chat assistant.

## What has been built

**Frontend** (`unlu-tool/`)
- `login.html` + `js/login.js`: student-ID login form, session stored in `localStorage`.
- `planner.html` + `js/dashboard.js`: main dashboard with student/program/major info, progress metrics (earned/remaining units), a course-records table, study-plan controls (generate/save/export to PDF), a planner chat panel, and saved-plan version history.
- `js/api.js`: API client that talks to the backend (`http://localhost:3001/api`).

**Backend** (`unlu-tool/backend/`)
- Layered architecture (repositories → services → routes) built on Express and SQLite (`better-sqlite3`).
- **Routes**: login, programs/majors, course lookup, student progress, eligible-course listing, study-plan generation/save/delete/validation, major "option slot" selection, course-record management, and planner chat.
- **Key services**:
  - `ruleEngineService` — evaluates prerequisite/exclusion/assumed-knowledge rules for courses.
  - `progressService` — computes degree progress (units earned, requirement-block completion, level distribution).
  - `studyPlanService` — generates, validates, saves, and manages versions of semester-by-semester study plans.
  - `majorOptionService` — manages a student's choice of course for major "option slots".
  - `catalogService` — aggregates program/major/course catalog data.
  - `ollamaProvider` + `plannerChatService` — use a local Ollama instance (model `gemma3`) to parse natural-language requests (e.g. reduce a term's course load, move a course, "what-if" adjustments) into concrete study-plan changes.
- **Database**: SQLite schema covering programs, majors, courses, requirement blocks (with join tables), course-level rules, prerequisite/exclusion rules, student profiles, student course history, major option-slot selections, and saved study-plan versions. Seed data is included for a Bachelor of IT program and a Bachelor of Computer Science (AI) program.

## AI Planner Chat Assistant

The dashboard includes a chat panel where a student can type a plain-language request instead of manually editing the study plan. For example:

- "Reduce my course load next term"
- "Move [course] to a later semester"
- "What if I take an extra elective this term?"

Under the hood:

1. The message is sent to `ollamaProvider.parsePlannerMessage`, which calls a **local Ollama instance** (`http://localhost:11434/api/chat`, model `gemma3`) with a strict system prompt and JSON schema. Ollama's only job is to turn free text into a structured intent — one of `reduce_term_load`, `move_course_request`, `what_if_adjustment`, or `unknown` — it never generates the plan itself.
2. `plannerChatService.applyPlannerIntent` takes that structured intent and dispatches it to the matching handler (`reduceTermLoad`, `moveCourseRequest`, or `whatIfAdjustment`).
3. That handler calls into `studyPlanService` to actually recompute and validate the affected part of the study plan (respecting prerequisites, unit limits, and requirement rules via `ruleEngineService`), then returns the updated plan to the frontend.

Because parsing and plan mutation are separate steps, the AI model never decides academic rules directly — it only translates intent, while all planning logic stays deterministic and rule-based. This also means the chat feature requires Ollama running locally with the `gemma3` model pulled; without it, the rest of the app (progress tracking, manual plan editing, etc.) still works normally.

## Running it

```bash
cd unlu-tool/backend
npm install
npm start
```

The server listens on port `3001` (override with the `PORT` env variable) and also serves the static frontend, so you can just open `http://localhost:3001/login.html`.

The planner chat feature additionally requires a local [Ollama](https://ollama.com) instance running the `gemma3` model on port `11434`.
