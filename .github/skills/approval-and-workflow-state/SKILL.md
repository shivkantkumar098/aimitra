---
name: approval-and-workflow-state
description: "Gate protocol and CLI usage for recording workflow state, human approvals, rejections, blocks and staleness with scripts/sdlc/sdlc.js. Use when the orchestrator starts a run, hands off between stages, resumes a run, or asks the human to approve."
---
# Human Approval and Workflow State Management

**Used by:** sdlc-orchestrator

## Purpose
Keep the run state truthful and make every stage transition depend on an explicit human decision recorded against the exact artifacts approved.

## When to use
- Starting, resuming or ending a run; before and after every worker; at every approval gate.

## Required inputs
- Issue key and source (`jira` with URL only if actually retrieved, else `pasted`).
- The stage owner and artifacts from `scripts/sdlc/lib/stages.js`.
- The human's literal response at each gate.

## Procedure
1. Start: `node scripts/sdlc/sdlc.js init --key <KEY> --source jira|pasted [--source-url <url>]`.
2. On resume: `status`, `git status`, then `verify`. Stale stages need renewed approval; never carry approval across a changed artifact.
3. Per stage: `start <stage>`, delegate to the worker, then `submit <stage> [--files a,b] [--evidence ...]`. Submit enforces the artifact contract.
4. At the gate, summarise the output, changed files, decisions, risks, unresolved issues and test or review evidence. Offer: approve, request changes, or stop. Then wait.
5. Approve only on an explicit human reply: `approve <stage> --by "<name>" --text "<their words verbatim>"`. Never infer approval from silence, a prior approval, successful tests or a worker's recommendation.
6. Changes requested: `changes <stage> --notes ...`, delegate the fix, revalidate and re-present. Rejection: `reject <stage> --reason ...`; the run halts and nothing downstream runs. Worker failure: `block <stage> --reason ...` (with evidence), later `unblock`. Upstream rework: `reopen <stage> --reason ...`.
7. Before commit or PR: `can-publish`. After a real commit: `record-commit --sha --message`. After a real PR: `record-pr --url`. Finish with `summary`.

## Expected outputs
`docs/sdlc/<KEY>/workflow-state.json` (run ID, stage statuses, hashes, decisions, evidence, blockers, commit, PR) and a final summary of agents run and gates approved.

## Quality checks
- Statuses in state match what actually happened; no stage skipped.
- Each approval records approver and the human's verbatim text.
- State contains no credentials.
- Approvals are bound to artifact hashes; any change makes them STALE.

## Failure handling
- Contract error on submit: return the worker to fix the artifact; do not edit state by hand.
- Lock or conflict errors: rerun the command; if state is corrupt, stop and report.
- Jira or GitHub MCP unavailable: report the limitation; never fabricate retrieved data or remote results.

## Human approval
Approval is required at every stage and is stage-specific. The workflow never merges. PR creation is impossible until the final PR-stage approval is recorded and `can-publish` passes.
