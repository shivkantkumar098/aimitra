---
name: commit-and-pr-preparation
description: "Prepares a focused commit and a truthful pr-draft.md with all required PR sections, and creates the PR through GitHub MCP only after final recorded human approval. Use when the PR stage starts or the PR description must be drafted."
---
# Commit and Pull Request Preparation

**Used by:** pr-creation-agent

## Purpose
Package only the approved changes into a commit and a complete, accurate PR description, then publish only when the human has given final approval.

## When to use
- Stage 8 (`pr_creation`), after verification is APPROVED.

## Required inputs
- All approved artifacts in `docs/sdlc/<ISSUE-KEY>/` and the verification evidence.
- `git status`, current branch, staged changes, recent commits.
- The workflow summary (`node scripts/sdlc/sdlc.js summary`).

## Procedure
1. Inspect `git status`, branch and history. Confirm HEAD is the feature branch recorded in the workflow state, named `<ISSUE-KEY>/<feature-name>` (for example `DOC-SYNC-001/documentation-sync`), never `main`/`master`. Commit only on this branch; only `origin` (`shivkantkumar098/aimitra`) is used.
2. List the approved files (code, tests, docs, SDLC artifacts). Stage them by name; never use `git add -A` or `git add .`. Unrelated user changes (for example under `frontend/`) must stay out.
3. `docs/sdlc/<KEY>/pr-draft.md` and `workflow-state.json` are gitignored and are not committed; the draft is the PR body source.
4. Prepare the commit message with workflow-level attribution that is true, for example `feat(agentic-sdlc): ... [workflow: sdlc-orchestrator]`. Leave Git author metadata untouched; do not impersonate anyone.
5. Write `pr-draft.md` with the proposed commit message and these sections: Summary; Jira Reference; Changes Made; Agent Execution Summary (orchestrator and workers with their actual contributions only); Test Evidence (real output or a real CI link); Documentation Sync Results; Known Limitations; Human Approval Record (from the state summary); Reviewer Checklist. State that the work was prepared through the GitHub Copilot Agentic SDLC workflow coordinated by the SDLC Orchestrator.
6. Never invent a commit hash, CI URL, test output, approval or PR number. Record a real commit with `record-commit` only after it exists.
7. Validate: `node scripts/sdlc/validate-pr-draft.js docs/sdlc/<KEY>/pr-draft.md`.
8. Show the staged file list, commit message and PR draft to the human and ask for explicit FINAL approval.
9. Only after the orchestrator has recorded that approval and `can-publish` passes: push with `git push -u origin <KEY>/<name>` (the GitHub MCP cannot push local commits; the `block-unsafe-ops` hook gates this), discover the GitHub MCP tools, and call `create_pull_request` with owner `shivkantkumar098`, repo `aimitra`, head = the feature branch, base `main`. Record the real URL with `record-pr`. Never merge: the workflow ends at "PR URL reported", and a human with merge rights merges to `main` later in GitHub, outside this pipeline.

## Expected outputs
A local commit containing only approved files, and `pr-draft.md` with: Proposed commit message; Summary; Jira Reference; Changes Made; Agent Execution Summary; Test Evidence; Documentation Sync Results; Known Limitations; Human Approval Record; Reviewer Checklist. After approval: a real PR URL.

## Quality checks
- Staged file list equals the approved list; secrets scan of the diff is clean.
- Every claim in the draft is backed by an artifact or command output.
- Known limitations include every unresolved finding and unexecuted check.

## Failure handling
- Changes cannot be isolated from unrelated work: stop and ask.
- GitHub MCP lacks push or create-PR capability, or is unavailable: stop and report; do not simulate or claim success.
- `can-publish` fails (stale or unapproved artifacts): do not publish; report the reasons.

## Human approval
Final approval is a separate, explicit decision for this stage; earlier approvals do not cover it. Do not push or create the PR until it is recorded. Merging is never performed by this workflow; a human merges to `main` later in GitHub.
