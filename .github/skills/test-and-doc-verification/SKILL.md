---
name: test-and-doc-verification
description: "Runs the project's real tests and checks, verifies documentation against source, and reports PASS, FAIL, BLOCKED or NOT RUN honestly in verification-report.md. Use when the verification stage starts or after fixes need re-verification."
---
# Test Execution and Documentation Verification

**Used by:** verification-agent

## Purpose
Prove, with executed commands and real output, that the implementation meets the approved requirements and that documentation matches the code.

## When to use
- Stage 7 (`verification`), after code review is APPROVED.
- Re-verification after any fix.

## Required inputs
- Approved `requirements.md`, `impl-plan.md`, `design-review.md`, `code-review.md`.
- The implemented code, tests and docs, and a clean understanding of `git status`.

## Procedure
1. Build a requirement-to-test traceability matrix: each requirement and acceptance criterion maps to specific tests or checks.
2. Add or improve tests only where coverage is missing, including positive, negative, missing-field and missing-file cases. Declare these files for `submit --files`.
3. Run the real commands that apply and capture output:
   - `node --test tests/sdlc`
   - `python -m unittest discover -s tests/doc_sync`
   - `python -m scripts.doc_sync --check`
   - `python -m compileall backend`
   - `cd frontend && npm run build` when frontend files changed
4. Verify documentation: interfaces, fields, examples and configuration in the docs match the source; list every mismatch.
5. Give each check a status: PASS, FAIL, BLOCKED (cannot run, with the cause), or NOT RUN (not attempted, with the reason).
6. Never edit acceptance criteria or loosen a test to obtain a pass. Report failures with output and route fixes through the orchestrator.
7. Write `docs/sdlc/<ISSUE-KEY>/verification-report.md`. Do not call the work production-ready if any required check is FAIL, BLOCKED or NOT RUN.

## Expected outputs
`verification-report.md` with: Requirement-to-test traceability; Commands executed; Test results (actual output, PASS/FAIL per check); Documentation consistency; Unexecuted checks and reasons; Known limitations; Final verification status.

## Quality checks
- Every command listed was actually run, with the real exit status and key output.
- Every requirement appears in the matrix; gaps are stated.
- Simulated or mocked checks are labelled as such and not presented as real Jira or GitHub results.
- Final status is consistent with the individual results.

## Failure handling
- Test failure: status FAIL with output; recommend the corrective stage; do not proceed on your own.
- Tool missing or environment broken: status BLOCKED with the exact error.

## Human approval
Present the report and evidence and wait. The pull request stage starts only after the orchestrator records the human's explicit approval of the verification report, including any failures or unexecuted checks.
