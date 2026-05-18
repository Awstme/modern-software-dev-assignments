# Safe Change

Purpose: make a small feature change in the Week 4 starter app with tests and verification.

Input: `$ARGUMENTS`

Use this command when the user asks to add or adjust a backend endpoint, frontend behavior, parser rule, or validation rule.

## Steps

1. Restate the requested change in one sentence.
2. Read `docs/TASKS.md`, `CLAUDE.md`, and the smallest relevant set of files.
3. Identify the test file that should prove the behavior:
   - notes endpoints: `backend/tests/test_notes.py`
   - action item endpoints: `backend/tests/test_action_items.py`
   - extraction logic: `backend/tests/test_extract.py`
4. Write or update focused tests before implementation.
5. Implement the smallest change across routers, schemas, models, services, and frontend files.
6. Run `make test`.
7. If tests fail, summarize the failure, fix the smallest root cause, and rerun.
8. Finish with:
   - changed files
   - verification commands and results
   - rollback notes
   - any remaining risk

## Safety Notes

- Do not delete data files or reset git state.
- Do not introduce a frontend build system.
- Keep changes scoped to the requested feature.
- If a migration would be required, call it out instead of silently changing persisted data.
