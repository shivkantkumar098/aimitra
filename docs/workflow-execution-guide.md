# Workflow Execution Guide

How to run and demonstrate the Agentic SDLC, from selecting a Jira issue to a prepared pull request, pausing for your approval at every stage. Related: [human-approval-workflow](human-approval-workflow.md), [agent-responsibilities](agent-responsibilities.md), [commit-and-pr-conventions](commit-and-pr-conventions.md).

## 1. Prerequisites

- VS Code with GitHub Copilot Agent Mode; the agent files in `.github/agents/` must be picked up by your version (see the verification caveat in [agentic-sdlc-architecture](agentic-sdlc-architecture.md#9-limitations-read-before-relying-on-this)).
- Node 20+ (workflow scripts and hooks) and Python 3.13 (doc-sync tool). No packages need installing for either.
- Jira MCP server running (`Atlassian-MCP` in `.vscode/mcp.json`). **Before using it:** revoke the Jira API token that was exposed during authoring and switch the file to prompt inputs (snippet in the architecture doc, limitation 8).
- A GitHub MCP server for PR creation, targeting `shivkantkumar098/aimitra` (the existing `origin`; no other remote is used). Copy `.github/mcp.example.json` to `.vscode/mcp.json` (it defines `github` and `Atlassian-MCP`, all credentials via prompt inputs) and create a fine-grained PAT restricted to that one repository (Contents and Pull requests: read/write, Metadata: read). The server key `github` must match the `github/*` reference in `pr-creation-agent.agent.md`. Start the server from the MCP view and confirm its tools list `create_pull_request`. The server cannot push local commits: after final approval the branch is pushed with `git push -u origin <KEY>/<name>` (hook-gated), then `create_pull_request` is called with owner `shivkantkumar098`, repo `aimitra`, head = the feature branch, base `main`. If PR creation is unavailable, the PR stage stops and tells you; it does not simulate it.
- Each change gets its own branch named `<ISSUE-KEY>/<feature-name>` (lowercase kebab-case, 3-50 chars); this work uses `DOC-SYNC-001/documentation-sync`. The orchestrator creates it from up-to-date `main` before the `implementation` stage starts (`node scripts/sdlc/sdlc.js suggest-branch --name <feature-name>`, then `git switch -c <KEY>/<name>`, then `check-branch`); `start implementation` records it, and later stages and `can-publish` require HEAD to still be on it. The workflow never works on or pushes `main`.
- Your unrelated uncommitted changes (for example under `frontend/src/`) stay untouched; the PR stage stages files by name.

## 2. Select the Jira issue

1. In Copilot chat, choose the **sdlc-orchestrator** agent (the only user-invocable one).
2. Tell it the issue: `Start the SDLC workflow for Jira issue <KEY>.` If you give none, it asks you to pick one.
3. The orchestrator initializes the run:
   - Retrieved through Jira MCP: `init --key <KEY> --source jira --source-url <issue-url>`.
   - Not retrieved (Jira MCP unavailable, or you paste a story): `init --key <KEY> --source pasted`. This is recorded as such and must never be presented as Jira-retrieved.
4. Sample input without Jira: `docs/sdlc/DOC-SYNC-001/user-story.md` is a **pasted sample**, not a real Jira issue. Use `--source pasted` with key `DOC-SYNC-001`.

## 3. Step-by-step demo script

The orchestrator runs `status` and `verify` first. At each gate it summarizes the output, changed files, decisions, risks and evidence, then asks you to approve, request changes or stop. Your reply is recorded verbatim. Example replies are shown; use your own words.

| # | Stage / agent | What happens | Artifact | You type at the gate (examples) |
| --- | --- | --- | --- | --- |
| 1 | `requirements` / `requirements-analysis-agent` | Reads the Jira issue and comments, asks clarifying questions one at a time (answer each), writes the document | `docs/sdlc/<KEY>/requirements.md` | `Approved: requirements are complete.` or `Change: add a missing-field scenario.` |
| 2 | `planning` / `planning-agent` | Tasks, dependencies, completion criteria | `impl-plan.md` | `Approved plan.` |
| 3 | `architecture` / `architecture-agent` | Design with Mermaid diagrams | `architecture.md` | `Approved architecture.` |
| 4 | `design_review` / `design-review-agent` | Severity-ranked findings; you decide resolutions or accepted risks; `architecture.md` updated | `design-review.md`, `architecture.md` | `Resolve DR-1 and DR-2 as proposed; accept DR-3 as a risk.` then `Approved final design.` |
| 5 | `implementation` / `implementation-agent` | Implements in plan order; reports files changed and real check results (`submit --files ...`) | code, tests, docs, `implementation-summary.md` | `Approved implementation.` |
| 6 | `code_review` / `code-review-agent` | Independent findings; accepted ones are fixed and re-reviewed | `code-review.md` | `Fix F-1 and F-3; skip F-2.` then `Approved after re-review.` |
| 7 | `verification` / `verification-agent` | Runs real checks; PASS/FAIL/BLOCKED/NOT RUN | `verification-report.md` | `Approved verification.` |
| 8 | `pr_creation` / `pr-creation-agent` | Local commit of approved files; PR draft validated with `validate-pr-draft.js`; commit and PR text shown to you | `pr-draft.md`, local commit | `FINAL approval: create the pull request.` (separate from all earlier approvals) |
| - | Orchestrator | After `can-publish` passes: `git push -u origin <KEY>/<name>`, create PR (head = feature branch, base `main`) through GitHub MCP, `record-pr`, final `summary`. Does not merge; the workflow ends at "PR URL reported" and a human with merge rights merges to `main` later in GitHub | PR URL | n/a |

Orchestrator commands behind each stage (you normally do not type these):

```
node scripts/sdlc/sdlc.js start requirements
node scripts/sdlc/sdlc.js submit requirements
node scripts/sdlc/sdlc.js approve requirements --by "<your name>" --text "<your reply>"
```

In the implementation stage, the Documentation Sync tool is exercised with:

```
python -m scripts.doc_sync --check     # report drift, exit 1 when out of date
python -m scripts.doc_sync --write     # rewrite only the text between doc-sync markers
```

## 4. Resume and STALE demo

1. Complete stages 1 and 2, then close the session.
2. Edit `docs/sdlc/<KEY>/requirements.md` by hand (add a line).
3. Reopen the orchestrator and ask it to resume. It runs `status`, `git status`, `verify`.
4. Expected: `STALE: requirements ...`, and both `requirements` and `planning` show `STALE`. Planning cannot be approved on the old approval; the orchestrator restarts `requirements` and asks you again.

## 5. Failure and rejection demos

- **Rejection:** at any gate reply `Reject: the plan ignores security.` Expected: stage `REJECTED`, run `HALTED`; any later `start` fails with `RUN_HALTED`; the orchestrator explains what to fix and stops.
- **Worker failure:** stop the Jira MCP server and start a run. Expected: `requirements-analysis-agent` returns BLOCKED with the error, the orchestrator runs `block requirements --reason ...`, shows the evidence, and offers a pasted story (`--source pasted`). It does not invent story content.
- **Premature PR:** before the final approval, ask the agent to create the PR. Expected: `can-publish` fails and `block-unsafe-ops` denies (if hooks run in your client).
- **Merge request:** ask it to merge. Expected: refused; no worker or command merges.

## 6. Automated tests

Run from the repository root:

```
node --test tests/sdlc
python -m unittest discover -s tests/doc_sync -t .
python -m scripts.doc_sync --check
```

Optional project checks: `python -m compileall backend`, `cd frontend && npm run build` (the frontend has no test script).

### What is simulated and what is not

| Aspect | Automated tests | Needs the real thing |
| --- | --- | --- |
| Jira | Never contacted. Missing Jira data is tested at the state level (Jira source without a URL, invalid keys). | Real retrieval through `Atlassian-MCP` in Copilot |
| GitHub | Never contacted. PR URLs in tests are fixtures (`example/repo`), not real PRs. | Real push and PR creation through the GitHub MCP |
| Git | Hook tests use a temp directory and fake payloads; `validate-pr-draft` tests inject the commit-existence check | Real commit hashes from `git rev-parse` |
| Agents/LLMs | Never run. Tests read agent, skill and doc files as text. | Behavior of the models when following the instructions |
| Hook execution by the client | Hook scripts are run directly with synthetic stdin | Confirmation that your Copilot/VS Code actually runs them and honors `deny`/`ask` |

### What each test group proves (master prompt Section 14)

| Verification item | Evidence | Limits |
| --- | --- | --- |
| Nine agent definitions exist and are discoverable | `assets.test.js`: exactly nine `*.agent.md`; names match files; frontmatter valid; one `user-invocable: true` | Does not prove your client lists them |
| Responsibilities do not conflict | `assets.test.js`: one producer per artifact; each worker forbids state commands, merge and self-approval | Textual check |
| Skills use the documented format | `assets.test.js`: names equal directories, descriptions, 8 required headings in order, real `Used by` agent, every skill used | Format as understood, not verified against the installed client |
| Hooks use supported events and formats | `assets.test.js`: events from the documented set, scripts exist, every script referenced; hooks cannot call `approve` | Same caveat |
| Instruction files exist | `assets.test.js`: shared file topics; scoped files have `applyTo` | |
| Worker outputs match the orchestrator's contract | `workflow.test.js`: `submit` fails on a missing file, a missing section or an empty section; `assets.test.js`: referenced CLI commands exist | |
| Stage order and dependencies enforced | `workflow.test.js` stage-order test; `cli-e2e.test.js` SIMULATED full run | |
| Orchestrator pauses for approval | State machine: submitted stage stays `AWAITING_APPROVAL`, downstream blocked, approval needs `--by` and `--text`; `assets.test.js` checks the orchestrator document states the rules | Whether a model actually stops and asks is not machine-tested |
| Rejection prevents downstream execution | `workflow.test.js`, `cli-e2e.test.js` (`RUN_HALTED`, publish denied) | |
| Worker failure yields a blocked stage | `workflow.test.js`, `cli-e2e.test.js` SIMULATED Jira failure | |
| Missing Jira data handled gracefully | `workflow.test.js`/`cli-e2e.test.js`: Jira source needs a URL; bad keys and unknown sources rejected without touching disk | Real Jira retrieval failures are agent behavior, not tested |
| Unavailable MCP reported accurately | Orchestrator and worker documents require it (`assets.test.js` checks for the rules); BLOCKED path tested at state level | No test removes a real MCP server |
| PR impossible before explicit final approval | `workflow.test.js` publish-gate tests; `hooks.test.js`: push and create-PR denied before approval, `ask` after, denied again if files change | Hook enforcement depends on the client running hooks |
| No action merges a PR | `workflow.test.js`: no exported name contains "merge"; `hooks.test.js`: merge tool and `gh pr merge` denied; `assets.test.js` | |
| Attribution reflects real contributions | `cli-e2e.test.js`: `validate-pr-draft.js` rejects uncredited or unrun agents, missing attribution, secrets | |
| Evidence not fabricated | `validate-pr-draft.js` rejects unknown commit hashes, unverifiable CI links and pre-existing PR URLs; `record-commit` and `record-pr` validate formats | A validator cannot detect a fabricated test log |

The doc-sync tool itself is covered by `tests/doc_sync/test_doc_sync.py` (route and service extraction, `Not Found` fields, empty/missing folders, secret redaction, idempotency, drift detection, `--write`, stale file references, plus a check against this repository).

## 7. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `STAGE_ORDER` | An earlier stage is not `APPROVED`. Run `status`. |
| `CONTRACT` on `submit` | The artifact lacks a required section or it is empty. The message lists each problem; send it back to the owning worker. |
| `STALE` on `approve` or `submit` | A tracked file changed after submission or after verification approval. Resubmit and ask again (or repeat verification). |
| `RUN_HALTED` | A stage was rejected. Move the run's `workflow-state.json` aside and `init` again. |
| `RUN_EXISTS` | A run for that key already exists; resume it. |
| `LOCKED` | Another command holds `workflow-state.json.lock`. Retry; locks older than 30 s are removed automatically. |
| `CONFLICT` | State changed during the command; rerun it. |
| `CORRUPT_STATE` | Unreadable JSON. The file was not modified; restore it or start a new run. |
| `PUBLISH_BLOCKED` | The message lists unapproved or changed stages. |
| Hooks never fire | Your client may not support or load `.github/hooks/sdlc-hooks.json`. Then the hook protections do not apply; keep reviewing every tool call yourself. |
| `validate-docs` says `NOT RUN` | Python was not found on `PATH` (the hook uses `python` on Windows, `python3` elsewhere). |
| `doc_sync` exit 2 | Source folder missing or empty, unparsable source, or a doc file is missing; nothing was modified. |
| `doc_sync` exit 1 | Outdated or missing marker blocks, or a doc references a backend file that does not exist. `--write` fixes marker blocks only; fix stale prose by hand. |
