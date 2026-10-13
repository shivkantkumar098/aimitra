---
name: safe-implementation-doc-sync
description: "Implements only the approved plan in small increments, with tests, and synchronises documentation from source using scripts.doc_sync. Use when the implementation stage starts, or when review findings need code or documentation fixes."
---
# Safe Implementation and Documentation Sync

**Used by:** implementation-agent

## Purpose
Deliver the approved design as focused code, tests and documentation updates, with an honest implementation summary.

## When to use
- Stage 5 (`implementation`), after the final design is APPROVED.
- Applying fixes the human accepted from code review or verification.

## Required inputs
- Approved `requirements.md`, `impl-plan.md`, `architecture.md`, `design-review.md`.
- Current `git status`; know which uncommitted changes belong to the user (for example in `frontend/`) and leave them alone.

## Procedure
1. Check `git status` and the branch. Never overwrite, revert or reformat unrelated user changes.
2. Work through `impl-plan.md` in dependency order. One task at a time; reuse existing code and conventions; no unrelated refactoring.
3. Write or update unit and integration tests for each task, including missing-file, missing-field and error cases.
4. Documentation sync: run `python -m scripts.doc_sync --check` first and read the drift report. Confirm each inconsistency against the code, then run `python -m scripts.doc_sync --write`. Fields that cannot be determined from code are written as `Not Found`, never guessed. An empty or missing source folder yields a clear message, not a crash. Secrets, API keys and `.env` values must never appear in generated output.
5. Fix stale prose that the generator only reports (for example a reference to a file that does not exist) only when the evidence is clear, and cite it in the summary.
6. Run the relevant tests and quote real output. Never claim a test passed without running it.
7. Record every file you changed, decisions made, tasks completed, and any deviation from the plan.
8. Write `docs/sdlc/<ISSUE-KEY>/implementation-summary.md`. The orchestrator submits it with `submit implementation --files <changed files>`, so give the exact list.

## Expected outputs
Application code, tests and updated documentation, plus `implementation-summary.md` with: Files changed; Tasks completed (status per task ID); Decisions; Deviations from plan; Checks run (command and result).

## Quality checks
- Only approved behaviour is implemented; nothing invented.
- No credentials, tokens or `.env` content in any file or log.
- Tests exist for each task and have been executed.
- Generated documentation matches the code (`--check` reports no drift after `--write`).

## Failure handling
- Plan or design conflicts with the code: stop, report the deviation, ask; do not improvise.
- Test failure: report it with output; do not weaken tests to pass.
- Task blocked: tell the orchestrator the stage is BLOCKED, with evidence.

## Human approval
Work in small increments and present the summary and changes. Independent code review starts only after the orchestrator records the human's explicit approval of the implementation.
