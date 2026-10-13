# Human Approval Workflow

The human controls every stage. The orchestrator pauses at each gate, and approval is recorded only from an explicit human reply. Related: [agentic-sdlc-architecture](agentic-sdlc-architecture.md), [workflow-execution-guide](workflow-execution-guide.md).

## Gate protocol (7 steps)

At every gate the orchestrator must:

1. Summarize what the worker produced.
2. List the files changed.
3. Explain important decisions, risks and unresolved issues.
4. Present test or review evidence where applicable.
5. Ask you to **approve**, **request changes**, or **stop**.
6. Wait for an explicit reply.
7. Record the decision: `approve` (with your verbatim words), `changes`, or `reject`. Proceed only on approval.

## What counts as approval

| Counts | Does not count |
| --- | --- |
| Your explicit reply in the conversation, recorded with `--by <your name> --text "<your words verbatim>"` | Silence or no objection |
| | An approval given earlier for a different stage, or for an earlier version of the same artifact |
| | A worker finishing, or a worker's recommendation |
| | A generated artifact, a passing test, a clean review |

Approval of one stage never authorizes the next. The final PR stage (`pr_creation`) needs its own FINAL approval.

## Who may do what

| Action | Human | Orchestrator | Worker | Hook |
| --- | --- | --- | --- | --- |
| Decide approve / change / reject | Yes | Records only | No | No |
| Run `scripts/sdlc/sdlc.js` | Optionally | Yes | No (forbidden in every worker file) | No |
| Write the stage artifact | No | No (no `edit` tool) | Owner only | No |
| Create PR | Approves | Confirms `can-publish` | `pr-creation-agent` only, after final approval | Denies or asks |
| Merge PR to `main` | Later, in GitHub, if you have merge rights (outside this pipeline) | Never | Never | Denies |

## Flows

### Approve

`start <stage>` -> worker produces artifact -> `submit <stage>` (contract check) -> gate -> you approve -> `approve <stage> --by --text`. `approve` fails if the stage is not `AWAITING_APPROVAL`, if `--by` or `--text` is missing, or if any tracked file changed since `submit` (`STALE`).

### Request changes

`changes <stage> --notes "<what to change>"` sets `CHANGES_REQUESTED`. The orchestrator delegates the correction to the owning worker (`start <stage>` again, which increments `attempts` and clears the previous approval), revalidates, and presents the revised output for approval again. Earlier events stay in `events`.

For a stage already approved, `reopen <stage> --reason` moves it to `CHANGES_REQUESTED` and marks every later in-flight or approved stage `STALE`.

Special loops:
- **Design review:** you approve a resolution; the orchestrator relays it to `architecture-agent` to update `architecture.md`; `design_review` is resubmitted and you approve the final design.
- **Code review:** you accept findings; `implementation-agent` fixes them; relevant checks rerun; `code-review-agent` re-reviews; `code_review` is resubmitted with the changed files (see rebaseline rule below) and you approve.

### Reject

`reject <stage> --reason "<why>"` sets the stage `REJECTED` and the run `HALTED`; later stages become `STALE`. All later `start`, `submit` and `approve` calls fail with `RUN_HALTED`. The orchestrator must explain what has to be corrected and must not continue silently.

### Block (worker failure)

If a worker returns BLOCKED or errors, the orchestrator runs `block <stage> --reason "<evidence>"`, reports the failure with its dependencies and corrective actions, and asks you how to proceed. After the cause is fixed, `unblock <stage>` sets `CHANGES_REQUESTED`, and the stage restarts with `start`.

## Hash binding and STALE

- `submit` records the SHA-256 of each stage artifact and declared source file. `approve` stores them as `approvedHashes`.
- `verify` (also run implicitly by `can-publish`) re-hashes all approved stages. Any change marks that stage and all later non-pending stages `STALE` and clears their approvals. The orchestrator must restart the stage and ask you again; nothing carries over.
- A persisted approval never authorizes a materially changed artifact.
- Rebaseline rule: a later stage may revise an earlier stage's file (`design_review` -> `architecture.md`; `code_review` and `verification` -> implementation files). The earlier hash is updated at `submit` of the later stage and takes effect only if you approve the later stage.
- Freeze rule: between `verification` approval and `pr_creation` submit, no tracked file may change; otherwise `submit` fails with `STALE` and verification must be repeated.

## Resume procedure

When a session starts or resumes, the orchestrator:

1. Runs `node scripts/sdlc/sdlc.js status --key <KEY>`.
2. Runs `git status` to see uncommitted changes.
3. Runs `node scripts/sdlc/sdlc.js verify --key <KEY>` to detect artifacts changed since approval.
4. Treats any `STALE` stage as unapproved: restarts it and requests fresh approval. It never infers approval for a newly generated or changed artifact.

If the state file is corrupt the CLI reports `CORRUPT_STATE` and leaves it untouched; restore it from backup or start a new run.

## CLI reference

Run from the repository root. `--key` may be omitted when exactly one run is `ACTIVE`.

```
node scripts/sdlc/sdlc.js init --key DOC-1 --source jira --source-url <issue-url>
node scripts/sdlc/sdlc.js init --key DOC-SYNC-001 --source pasted
node scripts/sdlc/sdlc.js status [--key KEY]
node scripts/sdlc/sdlc.js start <stage> [--key KEY]
node scripts/sdlc/sdlc.js submit <stage> [--files a.py,b.py] [--evidence "text,text"]
node scripts/sdlc/sdlc.js approve <stage> --by "<name>" --text "<verbatim reply>"
node scripts/sdlc/sdlc.js changes <stage> --notes "<notes>"
node scripts/sdlc/sdlc.js reject  <stage> --reason "<reason>"
node scripts/sdlc/sdlc.js block   <stage> --reason "<evidence>"
node scripts/sdlc/sdlc.js unblock <stage>
node scripts/sdlc/sdlc.js reopen  <stage> --reason "<reason>"
node scripts/sdlc/sdlc.js verify
node scripts/sdlc/sdlc.js can-publish
node scripts/sdlc/sdlc.js record-commit --sha <sha> --message "<message>"
node scripts/sdlc/sdlc.js record-pr --url https://github.com/<owner>/<repo>/pull/<n>
node scripts/sdlc/sdlc.js summary
```

`--source jira` requires `--source-url`; use `--source pasted` when the story was not retrieved through Jira MCP, so the record is honest about its origin. Stage ids: `requirements, planning, architecture, design_review, implementation, code_review, verification, pr_creation`.

## The `ask` prompt

`block-unsafe-ops` (a `PreToolUse` hook) returns a decision of `ask` instead of `allow` for:

- any command containing `scripts/sdlc/sdlc.js approve`;
- `git push` (origin and the run's feature branch only) and the create-PR MCP tool (owner/repo = origin, head = the feature branch, base = `main`), even when the final approval is recorded. `gh pr create` is always denied so those fields can be verified;
- `record-pr`, when the publish gate passes.

In a client that supports the `ask` decision, the client shows a confirmation dialog with the hook's reason; nothing runs until you confirm. For `approve`, confirm only if you gave that approval and the `--text` matches your reply. If your client does not run hooks or ignores `ask`, this safeguard does not exist; see the limitations in [agentic-sdlc-architecture](agentic-sdlc-architecture.md).

The same hook **denies** (exit code 2) pushes, PR creation and `record-pr` when `canPublish` fails or no run is active, and denies merge, force-push, push to `main`/`master`, `git reset --hard`, `git clean -f`, `git checkout --`, `git restore .`, `--no-verify`, direct edits of `workflow-state.json`, and commits made during an active run unless `pr_creation` is `IN_PROGRESS`. It also enforces the branch convention `<ISSUE-KEY>/<feature-name>`: it denies branch creation, commits, pushes and PR creation that violate it, pushes to any remote other than `origin`, and a PR whose owner/repo is not origin's (`shivkantkumar098/aimitra`), whose head is not the feature branch recorded in the workflow state, or whose base is not `main`. `start implementation` records the branch; later stages and `can-publish` require HEAD to still be on it.

## PR final approval and no-merge rule

- `can-publish` succeeds only when the run is `ACTIVE`, all eight stages are `APPROVED` with recorded approvals (the eighth being your FINAL approval of the commit and PR description), and no approved file has changed.
- The PR is created only after that. `record-pr` re-checks the gate and requires a real `https://github.com/<owner>/<repo>/pull/<n>` URL.
- The workflow ends at "PR URL reported". It never merges a PR: no CLI command, worker, or skill performs a merge, `block-unsafe-ops` denies merge tools and `gh pr merge`, and the recorded PR has `merged: false`. A human with merge rights merges the PR to `main` later in GitHub, outside this pipeline; the human stays in the loop for that decision.
