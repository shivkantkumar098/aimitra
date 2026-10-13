---
name: design-review
description: "Skeptical, independent review of architecture.md against requirements and the plan, with severity-ranked findings and evidence-backed resolutions in design-review.md. Use when the design review stage starts or findings must be resolved before implementation."
---
# Structured Design Review

**Used by:** design-review-agent

## Purpose
Find defects and risks in the proposed design before any code is written, and record how each was resolved or knowingly accepted.

## When to use
- Stage 4 (`design_review`), after `architecture.md` is APPROVED.
- Re-review after architecture revisions requested by the human.

## Required inputs
- Approved `requirements.md`, `impl-plan.md`, `architecture.md`.
- Read access to the code the design touches, so claims can be checked against it.

## Procedure
1. Act as a skeptical principal engineer who did not write the design. Do not rubber-stamp.
2. Compare the architecture to each requirement and plan task; look for missing behaviour, inconsistencies, security gaps, failure modes, needless complexity and untestable parts.
3. For every finding record: Finding ID (DR-1, ...), Severity (Critical, High, Medium, Low), Description, Impact, Recommendation, Resolution status.
4. Label each finding as a confirmed defect (cite the contradicting requirement or file) or a potential risk (state the condition under which it bites).
5. Present the findings and proposed resolutions to the human. Resolution statuses: Open, Resolved (needs evidence: the changed section of `architecture.md` or a cited file), Accepted risk (needs the human's explicit decision, recorded with their words).
6. Edit `architecture.md` only for resolutions the human approved; list each edit against its finding ID. `architecture.md` is then submitted together with `design-review.md`.
7. Never mark a finding Resolved without evidence.

## Expected outputs
`design-review.md` with a findings table containing Finding ID, Severity, Description, Impact, Recommendation, Resolution status; plus an updated `architecture.md` where required.

## Quality checks
- Each Critical or High finding has a resolution or an explicit accepted-risk decision.
- Findings reference concrete requirement IDs, sections or files.
- No finding is padded: if the design is sound in an area, say so briefly.
- Revisions in `architecture.md` correspond one-to-one with approved resolutions.

## Failure handling
- Input artifacts missing or stale: stop; tell the orchestrator the stage is BLOCKED.
- Disagreement with the human on a finding: record both positions; accepted risk requires their explicit statement.

## Human approval
Show findings, severities, proposed decisions and any architecture edits, then wait. Implementation starts only after the orchestrator records the human's approval of the final design; the review agent never approves its own review.
