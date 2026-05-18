# Week 4 Write-up
Tip: To preview this markdown file
- On Mac, press `Command (⌘) + Shift + V`
- On Windows/Linux, press `Ctrl + Shift + V`

## SUBMISSION DETAILS

Name: **Awstme** \
SUNet ID: **awstme** \
Citations: **Anthropic Claude Code best practices, https://www.anthropic.com/engineering/claude-code-best-practices; Claude Code SubAgents overview, https://docs.anthropic.com/en/docs/claude-code/sub-agents**

This assignment took me about **3** hours to do. 


## YOUR RESPONSES
### Automation #1
a. Design inspiration (e.g. cite the best-practices and/or sub-agents docs)
> I created `CLAUDE.md` as a repository guidance automation inspired by the Claude Code best-practices advice to give the agent durable project context, repeatable commands, and clear safety boundaries. The goal was to reduce repeated manual explanation before each coding task.

b. Design of each automation, including goals, inputs/outputs, steps
> Goal: give the coding agent a concise map of the Week 4 app and a safe endpoint-change workflow. Input: any future request to modify the app. Output: consistent navigation, test selection, implementation order, and verification steps. Steps: read the project map, identify the relevant router/schema/model/test files, write focused tests, implement the smallest change, update the static frontend when needed, and run verification commands.

c. How to run it (exact commands), expected outputs, and rollback/safety notes
> File: `week4/CLAUDE.md`. Claude Code reads this file automatically when working in the `week4/` context. The expected output is better-scoped changes and a final summary that includes changed files and verification. Safety notes: it explicitly says to avoid broad refactors, avoid raw SQL, preserve FastAPI response models, and use `make test` / `make lint` as gates. Rollback is normal git rollback of `CLAUDE.md` or any feature branch changes.

d. Before vs. after (i.e. manual workflow vs. automated workflow)
> Before: I had to manually remember where routers, schemas, tests, seed data, and frontend files lived. After: the agent has a stable project map and a repeatable workflow for endpoint changes, so adding features requires less rediscovery and fewer missed test steps.

e. How you used the automation to enhance the starter application
> I used the `CLAUDE.md` workflow to scope the notes enhancements. It pointed the change through `backend/app/routers/notes.py`, `backend/app/schemas.py`, `backend/tests/test_notes.py`, and the static frontend files. This produced case-insensitive note search, note editing, note deletion, and validation coverage.


### Automation #2
a. Design inspiration (e.g. cite the best-practices and/or sub-agents docs)
> I created `.claude/commands/safe-change.md` as a custom slash-command workflow. It was inspired by the best-practices recommendation to turn repeated development routines into reusable commands, and by the SubAgents overview's emphasis on clear role boundaries and explicit handoffs.

b. Design of each automation, including goals, inputs/outputs, steps
> Goal: provide a reusable safe-change checklist for small feature work. Input: `$ARGUMENTS`, such as "add note delete endpoint" or "extend extraction tags." Output: a tested implementation summary with changed files, verification results, rollback notes, and remaining risks. Steps: restate the request, read `docs/TASKS.md` and `CLAUDE.md`, choose the correct test file, write or update tests, implement the smallest change, run `make test`, fix failures, and summarize.

c. How to run it (exact commands), expected outputs, and rollback/safety notes
> Run from Claude Code inside `week4/` with `/safe-change <feature request>`, for example `/safe-change add edit and delete support for notes`. Expected output: a short implementation plan, code changes, test results, and a final summary. Safety notes: the command forbids deleting data files, resetting git state, adding a frontend build system, or silently making database migrations.

d. Before vs. after (i.e. manual workflow vs. automated workflow)
> Before: feature work was an ad hoc sequence of reading files, editing code, then remembering to test. After: the command forces a test-first path and a predictable closeout, which makes small backend/frontend changes easier to review.

e. How you used the automation to enhance the starter application
> I used the safe-change flow for two starter-app improvements. First, I improved notes by adding case-insensitive search plus `PUT /notes/{id}` and `DELETE /notes/{id}` with tests and frontend controls. Second, I extended extraction behavior by adding `extract_tags()` and a test for ordered de-duplication of tags like `#frontend`, `#urgent`, and `#qa-check`.


### *(Optional) Automation #3*
*If you choose to build additional automations, feel free to detail them here!*

a. Design inspiration (e.g. cite the best-practices and/or sub-agents docs)
> Not implemented.

b. Design of each automation, including goals, inputs/outputs, steps
> Not implemented.

c. How to run it (exact commands), expected outputs, and rollback/safety notes
> Not implemented.

d. Before vs. after (i.e. manual workflow vs. automated workflow)
> Not implemented.

e. How you used the automation to enhance the starter application
> Not implemented.
