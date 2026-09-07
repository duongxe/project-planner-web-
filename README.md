# AI Planner (UON Tool)

A web app that helps students plan coursework and track degree progress. Source code is in [unlu-tool/](unlu-tool/).

## What it does

Students log in with their student ID to view degree progress (core/major/elective requirements, unit rules), record completed or in-progress courses, auto-generate a semester-by-semester study plan, save multiple plan versions, and adjust plans via a chat assistant.

## Stack

- **Frontend**: plain HTML/CSS/JS (`login.html`, `planner.html`, `js/`).
- **Backend**: Node.js + Express + SQLite (`better-sqlite3`), layered as repositories → services → routes. Key services: `ruleEngineService` (prerequisite/exclusion rules), `progressService` (degree progress), `studyPlanService` (plan generation/validation/saving), `catalogService` (program/course data).
- **Database**: SQLite, seeded with a Bachelor of IT and a Bachelor of Computer Science (AI) program.

## AI chat assistant

The planner chat lets a student type requests like "reduce my load next term" or "move [course] later". A local **Ollama** instance (model `gemma3`) only parses the message into a structured intent (`reduce_term_load`, `move_course_request`, `what_if_adjustment`); `studyPlanService` then applies it, keeping all academic rules deterministic. Without Ollama running, the rest of the app still works normally.

## Running it

```bash
cd unlu-tool/backend
npm install
npm start
```

Server runs on port `3001` (override with `PORT`) and also serves the frontend — open `http://localhost:3001/login.html`. The chat assistant needs Ollama running locally with the `gemma3` model on port `11434`.
