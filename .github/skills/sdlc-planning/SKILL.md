---
name: sdlc-planning
description: "Breaks approved requirements into small, dependency-ordered, verifiable tasks and writes impl-plan.md. Use when the planning stage starts, or when requirements change and the implementation plan must be re-derived."
---
# Dependency-Ordered SDLC Planning

**Used by:** planning-agent

## Purpose
Produce `impl-plan.md`: an ordered list of small tasks, each with measurable completion criteria, so implementation and verification can follow it mechanically.

## When to use
- Stage 2 (`planning`), after `requirements.md` is APPROVED.
- Requirements were reopened and the plan is STALE.

## Required inputs
- Approved `docs/sdlc/<ISSUE-KEY>/requirements.md`.
- Repository inspection: `backend/` (FastAPI), `frontend/` (React), `scripts/`, `tests/`, existing docs.
- Known test commands (`node --test tests/sdlc`, `python -m unittest discover -s tests/doc_sync`, `npm run build` in `frontend/`, `python -m compileall backend`).

## Procedure
1. Read the whole requirements document; list each functional, non-functional, validation and security requirement.
2. Inspect the code to find the real files and components each requirement touches. Do not name files you have not seen unless you mark them as new.
3. Split work into tasks small enough to verify on their own (aim for one concern and a handful of files).
4. Give each task an ID (T1, T2, ...), description, dependencies, expected files or components, acceptance criteria, and validation steps (exact command or observable check).
5. Order tasks by dependency; make the order explicit and reject cycles.
6. Add a task for tests of every requirement, including negative and missing-input cases.
7. Identify risks, blockers and unresolved questions carried from the requirements. A task depending on an unresolved question is listed as blocked with the blocker named.
8. Write `docs/sdlc/<ISSUE-KEY>/impl-plan.md` with a requirement-to-task cross-reference.

## Expected outputs
`impl-plan.md` containing: Task ID; Dependencies; Expected files or components; Acceptance criteria (measurable completion criteria); Validation steps; Blocked tasks and their blockers.

## Quality checks
- Every requirement maps to at least one task; every task maps to a requirement.
- No task lacks a measurable completion criterion ("works" is not measurable).
- Dependency order has no cycles and no forward references.
- Unrelated refactoring is not planned.

## Failure handling
- Missing or unapproved requirements: stop and tell the orchestrator; do not plan from drafts.
- Ambiguity the requirements do not settle: list it as a blocker, do not choose an answer.
- Repository cannot be inspected: report the error; mark the stage BLOCKED.

## Human approval
Show the plan, risks and blocked tasks, and wait. Approval of requirements does not approve the plan; architecture work starts only after the orchestrator records the human's explicit approval of `impl-plan.md`.
