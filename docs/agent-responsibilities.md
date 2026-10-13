# Agent Responsibilities

One orchestrator and eight workers. Definitions live in `.github/agents/<name>.agent.md`; stage ids, owners, artifacts and required sections come from `scripts/sdlc/lib/stages.js`. Artifacts are in `docs/sdlc/<ISSUE-KEY>/`.

See also: [human-approval-workflow](human-approval-workflow.md), [agent-skill-hook-mapping](agent-skill-hook-mapping.md).

## Summary

| # | Stage id | Agent | Output artifact(s) | Skill | Tools (frontmatter) |
| --- | --- | --- | --- | --- | --- |
| - | (all) | `sdlc-orchestrator` | `workflow-state.json` (via CLI), final summary | `approval-and-workflow-state` | `agent, read, search, execute, todo` |
| 1 | `requirements` | `requirements-analysis-agent` | `requirements.md` | `jira-requirements-analysis` | `read, search, edit, Atlassian-MCP/*` |
| 2 | `planning` | `planning-agent` | `impl-plan.md` | `sdlc-planning` | `read, search, edit` |
| 3 | `architecture` | `architecture-agent` | `architecture.md` | `architecture-mermaid` | `read, search, edit` |
| 4 | `design_review` | `design-review-agent` | `design-review.md` (tracks `architecture.md`) | `design-review` | `read, search, edit` |
| 5 | `implementation` | `implementation-agent` | code, tests, docs, `implementation-summary.md` | `safe-implementation-doc-sync` | `read, search, edit, execute, todo` |
| 6 | `code_review` | `code-review-agent` | `code-review.md` | `evidence-based-code-review` | `read, search, edit, execute` |
| 7 | `verification` | `verification-agent` | `verification-report.md` | `test-and-doc-verification` | `read, search, edit, execute` |
| 8 | `pr_creation` | `pr-creation-agent` | `pr-draft.md`, local commit | `commit-and-pr-preparation` | `read, search, edit, execute, github/*` |

Only the orchestrator has `user-invocable: true`. Only `pr-creation-agent` carries a GitHub MCP tool; only `requirements-analysis-agent` carries a Jira MCP tool. Tool names must be verified against your Copilot version and MCP server names.

## Conflict-avoidance rule

Every artifact has exactly one owner, listed under that agent's **Outputs**. The one shared file is `architecture.md`: `architecture-agent` authors it, and `design-review-agent` stage tracks it. Corrections after design review are applied only when the human approves a resolution and the orchestrator relays it. `tests/sdlc/assets.test.js` fails if an artifact is claimed by an unexpected agent.

All workers forbid the same set of actions: running `scripts/sdlc/sdlc.js`, approving their own work, creating a PR (except `pr-creation-agent`, and only after final approval), and merging.

## Orchestrator: `sdlc-orchestrator`

- **Responsibility:** Sole controller. Delegates one worker at a time, keeps state with the CLI, enforces stage order and approvals, runs `status` and `verify` at start and on resume.
- **Inputs:** The human's request, Jira issue (key and source), worker handoffs, `workflow-state.json`.
- **Outputs:** State transitions, gate summaries, final summary (`summary`).
- **Allowed:** Run `node scripts/sdlc/sdlc.js ...`; read/search; delegate.
- **Forbidden:** Writing artifacts or code (no `edit` tool); inferring approval; skipping or reordering stages; merging.
- **Approval gate:** Presents each worker's output; records only an explicit human decision.
- **Failure behavior:** Worker BLOCKED or error: `block <stage> --reason`, report evidence and corrective actions, ask the human. MCP unavailable: say so, never fabricate, offer a clearly labeled alternative (a pasted story recorded with `--source pasted`).
- **Handoff contract:** Passes the issue key and artifact paths to each worker; records `submit` evidence.

## 1. `requirements-analysis-agent`

- **Responsibility:** Retrieve the Jira issue via Jira MCP (read-only), read description, acceptance criteria, comments and links, ask clarifying questions one at a time, write `requirements.md`.
- **Inputs:** Issue key, Jira data, repository context.
- **Outputs:** `requirements.md` with the 10 sections in `stages.js` (issue key and link; problem and objective; functional; non-functional; acceptance criteria; positive and negative scenarios; validation and error handling; security; assumptions, dependencies, out of scope; unresolved questions).
- **Allowed:** Jira read, repo read/search, write `requirements.md`.
- **Forbidden:** Modifying Jira; guessing; fabricating Jira data; other files.
- **Approval gate:** Human approves before planning.
- **Failure:** Jira unavailable or issue missing: BLOCKED with exact error. A pasted story only if the human provided it.
- **Handoff:** status DONE/BLOCKED, artifact path, Jira key and URL (or "pasted"), evidence, open questions.

## 2. `planning-agent`

- **Responsibility:** Dependency-ordered, verifiable tasks with measurable completion criteria.
- **Inputs:** Approved `requirements.md`, repo structure.
- **Outputs:** `impl-plan.md`: Task ID, description, dependencies, expected files/components, acceptance criteria, validation steps, blocked tasks and blockers, order, risks.
- **Allowed:** Read/search, write `impl-plan.md`.
- **Forbidden:** Changing requirements; writing code.
- **Approval gate:** Human approves before architecture.
- **Failure:** Missing or contradictory requirements: BLOCKED with the gap.
- **Handoff:** status, path, task count and critical path, risks, open questions.

## 3. `architecture-agent`

- **Responsibility:** Smallest sound design within the existing FastAPI/React and Node tooling.
- **Inputs:** Approved requirements and plan; current repo architecture; human-approved corrections (relayed) after design review.
- **Outputs:** `architecture.md`: context and goals, component architecture with Mermaid, data flow, component responsibilities, integration boundaries, error handling, security, technology decisions and alternatives, testing strategy.
- **Allowed:** Read/search, write `architecture.md`.
- **Forbidden:** Writing code; changing approved requirements.
- **Approval gate:** Human approves before design review.
- **Failure:** Conflicting inputs or unsupported requirement: BLOCKED with evidence.
- **Handoff:** status, path, decisions and rejected alternatives, risks.

## 4. `design-review-agent`

- **Responsibility:** Skeptical independent review of the architecture against requirements and plan.
- **Inputs:** Approved requirements, plan, architecture; repo evidence.
- **Outputs:** `design-review.md`: per finding Finding ID, Severity (Critical/High/Medium/Low), Description, Impact, Recommendation, Resolution status. Distinguishes confirmed defects from potential risks.
- **Allowed:** Read/search, write `design-review.md`; edit `architecture.md` only to apply a human-approved resolution, citing the finding ID.
- **Forbidden:** Marking a finding resolved without evidence; self-approval; softening Critical/High findings.
- **Approval gate:** Human approves the final design (resolved or explicitly accepted risks) before implementation.
- **Failure:** Missing or stale input: BLOCKED.
- **Handoff:** status, paths, counts by severity, unresolved or accepted-risk findings.

## 5. `implementation-agent`

- **Responsibility:** Implement only the approved requirements and design, in plan order, in small increments; implement Automated Documentation Sync; update docs when a mismatch is confirmed by code evidence.
- **Inputs:** All approved artifacts.
- **Outputs:** Code, tests, updated docs, `implementation-summary.md` (files changed, tasks completed, decisions, deviations from plan, checks run).
- **Allowed:** Edit within approved scope; run tests; `python -m scripts.doc_sync` and `--check`.
- **Forbidden:** Unrelated refactoring; touching the user's unrelated uncommitted changes; reading `.env` or MCP token values; inventing behavior; claiming unrun checks passed; committing, pushing, PRs, merging.
- **Approval gate:** Human approves each controlled increment.
- **Failure:** Report evidence; BLOCKED rather than guessing.
- **Handoff:** status, summary path, the list of changed files (used for `submit --files`), checks with real results, deviations.

## 6. `code-review-agent`

- **Responsibility:** Independent review of the implementation against the approved requirements, architecture and plan.
- **Inputs:** Approved artifacts, `implementation-summary.md`, the actual diff.
- **Outputs:** `code-review.md`: per finding severity, file and location, evidence, recommended fix, status; plus a Review outcome. Covers correctness, security, validation, error handling, missing files and fields, API and permission failures, test coverage, doc correctness, readability, DRY, dependency safety, regressions, unrelated changes.
- **Allowed:** Read/search, read-only commands (git diff, tests, linters), write `code-review.md`.
- **Forbidden:** Editing source or tests; approving its own review.
- **Approval gate:** Human sees findings and proposed fixes; accepted findings are fixed by `implementation-agent`, checks rerun, `code-review-agent` re-reviews, human approves before verification.
- **Failure:** Cannot inspect diff or run a check: BLOCKED and listed as not performed.
- **Handoff:** status, path, counts, open findings, evidence.

## 7. `verification-agent`

- **Responsibility:** Prove with executed evidence that implementation and documentation match the approved requirements.
- **Inputs:** Approved requirements, plan, design review, code review, implementation, project test commands.
- **Outputs:** `verification-report.md`: requirement-to-test traceability, commands executed, test results, documentation consistency, unexecuted checks, known limitations, final verification status. Statuses PASS, FAIL, BLOCKED, NOT RUN.
- **Allowed:** Run tests and checks, `python -m scripts.doc_sync --check`, add or improve tests.
- **Forbidden:** Bypassing or deleting failing tests; changing acceptance criteria; declaring production-ready with failed or unverified required checks; fabricating output.
- **Approval gate:** Human approves before PR preparation.
- **Failure:** Failures recorded as FAIL with output; environment gaps as BLOCKED; skipped as NOT RUN.
- **Handoff:** status, final verification status, added test files (for `--files`), commands with real results.

## 8. `pr-creation-agent`

- **Responsibility:** Prepare a focused local commit and a truthful `pr-draft.md`; after final human approval, push and create the PR through GitHub MCP.
- **Inputs:** All approved artifacts and verification evidence, git status and branch, orchestrator state summary.
- **Outputs:** `pr-draft.md` (proposed commit message plus the 9 PR sections), a local commit containing only approved files.
- **Allowed:** Inspect git; stage by name; commit; write `pr-draft.md`; discover GitHub MCP capabilities; publish only when the orchestrator confirms `can-publish` and final approval.
- **Forbidden:** Publishing before final approval; any merge; force-push; falsifying authorship; fabricating hashes, CI links or PR numbers; crediting agents that did not work; secrets.
- **Approval gate:** Separate explicit FINAL approval after the human sees the commit and PR draft.
- **Failure:** Cannot isolate changes, an unapproved check, or MCP lacks a capability: BLOCKED with the exact manual alternative. No simulated remote operations.
- **Handoff:** status, `pr-draft.md`, real SHA (from `git rev-parse`), staged files, MCP capabilities found, real PR URL after approval only.
