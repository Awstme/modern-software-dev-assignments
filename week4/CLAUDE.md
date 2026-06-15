# Week 4 Developer Command Center Guide

Use this guide before changing the starter application.

## Project Map

- FastAPI app entry point: `backend/app/main.py`
- API routers: `backend/app/routers/`
- SQLAlchemy models: `backend/app/models.py`
- Pydantic schemas: `backend/app/schemas.py`
- Parsing helpers: `backend/app/services/`
- Static frontend: `frontend/index.html`, `frontend/app.js`, `frontend/styles.css`
- Tests: `backend/tests/`
- Assignment tasks: `docs/TASKS.md`

## Local Commands

Run commands from the `week4/` directory.

- Start app: `make run`
- Run tests: `make test`
- Format and fix lint: `make format`
- Check lint only: `make lint`

## Safe Change Workflow

When adding or changing an endpoint:

1. Read the relevant router, schema, model, and existing tests.
2. Add or update focused pytest coverage first.
3. Implement the smallest backend change that satisfies the tests.
4. Update the static frontend only when the behavior is user-facing.
5. Run `make test`; run `make lint` when the change touches Python style or imports.
6. Summarize changed files, verification results, and any remaining risk.

## Guardrails

- Keep the app dependency-free on the frontend; use plain HTML, CSS, and JavaScript.
- Preserve FastAPI response models and explicit 404 errors.
- Keep database commits in the existing dependency lifecycle; routers should use `flush()` and `refresh()` after writes.
- Prefer simple SQLAlchemy queries over raw SQL.
- Avoid broad refactors unless a task explicitly asks for one.
