# Agent, Skill, Hook and Instruction Mapping

Traceability matrix for the orchestrator and the eight workers. Names are the exact names in the repository. Stage artifacts live in `docs/sdlc/<ISSUE-KEY>/`. Contracts are defined in `scripts/sdlc/lib/stages.js`; `tests/sdlc/assets.test.js` checks this mapping against the files on disk.

Shared instructions (apply to every agent): `.github/copilot-instructions.md`.
Scoped instructions: `sdlc-artifacts.instructions.md` (`docs/sdlc/**`), `sdlc-workflow-assets.instructions.md` (agents, skills, hooks, `scripts/sdlc/**`, `tests/sdlc/**`), `doc-sync.instructions.md` (`scripts/doc_sync/**`, `tests/doc_sync/**`, `ARCHITECTURE.md`, `README.md`).

Hooks in this repository are workspace-level (`.github/hooks/sdlc-hooks.json`) and apply to every agent's tool calls; they are not attached to individual agents. "Relevant hooks" below lists the ones that matter most for that agent.

## 1. Agent matrix

| Agent | Responsibility | Input artifacts | Output artifacts | Skills used | Scoped instructions | Relevant hooks | Approval gate | MCP | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sdlc-orchestrator` | Coordinate 8 workers; enforce order and human approvals; keep state | Human request, worker handoffs, state | `workflow-state.json` (via CLI), summaries | `approval-and-workflow-state` | `sdlc-artifacts`, `sdlc-workflow-assets` | `block-unsafe-ops` (ask on `approve`), `audit-log`, `protect-secrets` | Presents every gate; records only explicit human replies | None directly | `block` stage with evidence; report MCP gaps; never fabricate |
| `requirements-analysis-agent` | Fetch Jira issue, clarify, write requirements | Issue key, Jira data | `requirements.md` | `jira-requirements-analysis` | `sdlc-artifacts` | `protect-secrets`, `audit-log` | Human approves before planning | Jira: `Atlassian-MCP/*` (read-only) | BLOCKED with error evidence; no invented story |
| `planning-agent` | Dependency-ordered task plan | `requirements.md` | `impl-plan.md` | `sdlc-planning` | `sdlc-artifacts` | `protect-secrets`, `audit-log` | Human approves before architecture | None | BLOCKED if requirements missing or contradictory |
| `architecture-agent` | Solution design with Mermaid | `requirements.md`, `impl-plan.md` | `architecture.md` | `architecture-mermaid` | `sdlc-artifacts` | `protect-secrets`, `audit-log` | Human approves before design review | None | BLOCKED on conflicting inputs |
| `design-review-agent` | Skeptical independent design review | `requirements.md`, `impl-plan.md`, `architecture.md` | `design-review.md` (and approved edits to `architecture.md`) | `design-review` | `sdlc-artifacts` | `protect-secrets`, `audit-log` | Human approves the final design before implementation | None | BLOCKED on missing or stale input |
| `implementation-agent` | Implement approved design and Documentation Sync | All approved artifacts | Code, tests, docs, `implementation-summary.md` | `safe-implementation-doc-sync` | `doc-sync`, `sdlc-workflow-assets`, `sdlc-artifacts` | `protect-secrets`, `block-unsafe-ops`, `validate-docs`, `audit-log` | Human approves increments before review | None | BLOCKED rather than guess; never claim unrun tests |
| `code-review-agent` | Independent evidence-based review | Approved artifacts, `implementation-summary.md`, diff | `code-review.md` | `evidence-based-code-review` | `sdlc-artifacts` | `protect-secrets`, `audit-log` | Human approves before verification; review never self-approves | None | BLOCKED if diff or check cannot be run |
| `verification-agent` | Run real checks; verify docs vs code | Approved artifacts, implementation | `verification-report.md`, added tests | `test-and-doc-verification` | `doc-sync`, `sdlc-artifacts` | `validate-docs`, `protect-secrets`, `audit-log` | Human approves before PR preparation | None | FAIL / BLOCKED / NOT RUN recorded honestly |
| `pr-creation-agent` | Focused commit, PR draft, PR after final approval | All approved artifacts, git state, state summary | `pr-draft.md`, local commit, PR (after approval) | `commit-and-pr-preparation` | `sdlc-artifacts` | `block-unsafe-ops` (deny/ask on push and PR), `protect-secrets`, `audit-log` | Separate FINAL human approval | GitHub: `github/*` (this agent only) | BLOCKED with manual alternative; no simulated remote operations |

## 2. Skill table

Skills are not auto-loaded. Each agent file instructs the agent to read its skill first.

| Skill (`.github/skills/<name>/SKILL.md`) | Used by | Why it exists |
| --- | --- | --- |
| `jira-requirements-analysis` | `requirements-analysis-agent` | Jira retrieval via MCP, one-at-a-time clarification, no silent resolution of ambiguity |
| `sdlc-planning` | `planning-agent` | Task IDs, dependency order, measurable completion criteria |
| `architecture-mermaid` | `architecture-agent` | Fit to the existing stack, Mermaid diagrams, integration boundaries, alternatives |
| `design-review` | `design-review-agent` | Severity scheme, confirmed defect vs risk, evidence rule for "Resolved" |
| `safe-implementation-doc-sync` | `implementation-agent` | Incremental safe changes and the `scripts.doc_sync` procedure |
| `evidence-based-code-review` | `code-review-agent` | Review checklist; findings need file, evidence, fix, status |
| `test-and-doc-verification` | `verification-agent` | Real commands, PASS/FAIL/BLOCKED/NOT RUN, traceability |
| `commit-and-pr-preparation` | `pr-creation-agent` | Staging by name, 9 PR sections, truthful attribution, publish gate |
| `approval-and-workflow-state` | `sdlc-orchestrator` | Gate protocol and CLI usage |

Every skill has Purpose, When to use, Required inputs, Procedure, Expected outputs, Quality checks, Failure handling and Human approval sections; the test suite enforces this and that each skill is used by one real agent.

## 3. Hook table

Configuration: `.github/hooks/sdlc-hooks.json`. Scripts: `scripts/sdlc/hooks/<name>.js`. Shared helpers: `scripts/sdlc/lib/hook-io.js`. No hook approves a stage, publishes, merges, or modifies workflow state (`assets.test.js` rejects hook scripts that call `approve` or `mutate`).

| Name | Purpose | Event | Command | Related agents | Inputs | Outputs | Failure behavior | Security implications | Blocks? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `protect-secrets` | Keep credentials out of agent context and files | `PreToolUse` | `node scripts/sdlc/hooks/protect-secrets.js` (timeout 10) | All | Tool name and arguments on stdin (JSON) | Nothing when allowed; on deny, a JSON decision on stdout, reason on stderr, exit code 2 | Fails closed: bad or empty input, or an internal error, denies the call | Denies path/command access to `.env*` (not `.env.example`), `*.pem/*.key/*.p12/*.pfx`, `id_rsa*`, any `mcp.json`; denies writes whose content matches credential patterns. Pattern matching is heuristic: it can miss unusual secrets and can false-positive | Yes |
| `block-unsafe-ops` | Enforce no-merge, publish gate, state integrity, protect uncommitted work | `PreToolUse` | `node scripts/sdlc/hooks/block-unsafe-ops.js` (timeout 15) | `pr-creation-agent`, `sdlc-orchestrator`, `implementation-agent`, all | Tool name and arguments on stdin; reads state in `docs/sdlc/*/workflow-state.json` | Deny (exit 2) or `ask` decision JSON on stdout; silent when allowed | Fails closed on bad input or errors. No ACTIVE run means publish is denied | Denies merge tools and `gh pr merge`, force-push, push to `main`/`master`, destructive git commands, `--no-verify`, direct edits of `workflow-state.json`. Push, `gh pr create` is always denied; the create-PR MCP tool is denied unless `canPublish` passes and owner/repo = origin, head = the run's feature branch and base = `main`, then `ask`; `git push` is limited to `origin` and the feature branch; branch creation and commits must follow `<ISSUE-KEY>/<feature-name>`. `sdlc.js approve` always `ask`. Commits during an active run denied unless `pr_creation` is `IN_PROGRESS`. Enforces the branch convention `<ISSUE-KEY>/<feature-name>`: denies branch creation, commits, pushes and PR creation that violate it, pushes to any remote other than `origin` (`shivkantkumar098/aimitra`), and a PR whose owner/repo is not origin's, whose head is not the feature branch recorded by `start implementation`, or whose base is not `main`. It never merges; a human merges to `main` later in GitHub, outside this pipeline. Command parsing is regex-based and can be evaded by indirection | Yes |
| `audit-log` | Record permitted workflow events and execution evidence | `PostToolUse`, `SubagentStart`, `SubagentStop` | `node scripts/sdlc/hooks/audit-log.js` (timeout 10) | All | Event payload on stdin | One JSON line appended to `.github/hooks/logs/sdlc-audit.jsonl` (gitignored): time, event, tool, redacted command (200 chars), target, agent. Tool output is never logged | Always exit 0; a log failure prints a note to stderr | Redacts known credential patterns before writing; the log can still reveal file paths and command text | No, report only |
| `validate-docs` | Surface documentation drift immediately after an edit | `PostToolUse` | `node scripts/sdlc/hooks/validate-docs.js` (timeout 30) | `implementation-agent`, `verification-agent` | Event payload; acts only on edit tools whose path is `README.md` or `ARCHITECTURE.md` | Runs `python -m scripts.doc_sync --check`; prints `{"systemMessage": ...}` with the result (redacted, max 1500 chars) | Always exit 0; if Python is missing it reports "NOT RUN" | Runs a local read-only command; output is redacted | No, report only |

### Format limitation

The file uses VS Code agent-hook configuration: PascalCase events (`PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`) with `{ "type": "command", "command": ..., "timeout": ... }`. GitHub Copilot CLI uses a different schema (camelCase events such as `preToolUse`, per-shell `bash`/`powershell` commands) and is **not** configured here, to avoid running every hook twice. The hook scripts do accept the CLI payload shape (`toolName`, `toolArgs`) so a CLI config could be added later. Event names, payload fields and decision semantics were written from documentation as understood and have not been verified against your installed Copilot/VS Code version.

### Desired capabilities that are not enforced

- Restricting each worker to writing only its own artifact: hooks do not know which agent is running, so this stays advisory (and is partially covered by hash tracking).
- Running tests automatically after code edits: only the doc-sync check is automated; other checks are run by the agents and reported.
