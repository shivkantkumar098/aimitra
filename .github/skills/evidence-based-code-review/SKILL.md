---
name: evidence-based-code-review
description: "Independent code review of the implementation against approved requirements, design and plan, with severity-ranked, evidence-backed findings in code-review.md. Use when the code review stage starts or fixes need re-review."
---
# Evidence-Based Code Review

**Used by:** code-review-agent

## Purpose
Give the human an independent, evidence-backed assessment of the implementation before verification, without approving its own review.

## When to use
- Stage 6 (`code_review`), after the implementation is APPROVED.
- Re-review after the human accepts findings and fixes are applied.

## Required inputs
- Approved `requirements.md`, `impl-plan.md`, `architecture.md`, `design-review.md`, `implementation-summary.md`.
- The actual diff (`git diff`, `git status`) and the changed files listed in the summary.

## Procedure
1. Review read-only. Do not edit code; fixes are delegated to the implementation agent after the human accepts a finding.
2. Compare the diff to the requirements, design and plan. Check each area: functional correctness; security and secret exposure; input validation; error handling; missing files, empty repositories and missing fields; API and permission failures; unit and integration test coverage; documentation correctness; readability; DRY and duplication; dependency safety and known vulnerabilities; regression risks; unintended or unrelated file changes.
3. Verify claims by reading code or running safe read-only commands. A finding without evidence is not a finding.
4. Record each finding: ID, Severity (Critical, High, Medium, Low), affected file and location (file:line), Evidence (quote or command output), Recommended fix, Status (Open, Fixed, Accepted risk, Rejected).
5. Present findings and proposed fixes to the human. Do not make significant or unrelated changes without their approval.
6. After accepted fixes, re-review the changed files, rerun relevant checks and update statuses with evidence.
7. State a Review outcome: findings remaining, and whether the review supports proceeding. This is a recommendation only.

## Expected outputs
`code-review.md` with a findings table (Severity, Location, Evidence, Recommended fix, Status) and a Review outcome section.

## Quality checks
- Every finding cites a file and line or a command output.
- Nothing flagged that the evidence does not support; nothing material omitted from the checklist.
- Unrelated or unapproved file changes are explicitly listed.
- Closed findings show proof (new diff, passing check).

## Failure handling
- Diff cannot be obtained or artifacts are stale: report it; mark the stage BLOCKED.
- Unable to run a check: record it as NOT RUN with the reason; do not assume it passes.

## Human approval
Show findings, fixes and the rerun evidence, then wait. A review never approves its own implementation; verification starts only after the orchestrator records the human's explicit approval.
