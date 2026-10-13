# Commit and PR Conventions

Rules for the commit and pull request produced by the pr-creation stage. Related: [human-approval-workflow](human-approval-workflow.md), `.github/skills/commit-and-pr-preparation/SKILL.md`.

## Branches

- Target repository: `shivkantkumar098/aimitra` (the existing `origin`). No other remote is used. PRs go from the feature branch to base `main`.
- Every change is made on its own branch named `<ISSUE-KEY>/<feature-name>`, where `feature-name` is lowercase kebab-case, 3-50 characters. Example: `DOC-SYNC-001/documentation-sync` (the branch for this very work).
- The orchestrator ensures the branch exists before the `implementation` stage starts: `node scripts/sdlc/sdlc.js suggest-branch --name <feature-name>` prints the name, then `git switch -c <KEY>/<name>` creates it from up-to-date `main`, and `check-branch` validates the current branch. `start implementation` records the branch in the workflow state; later stages and `can-publish` require HEAD to still be on it.
- All commits for the change land on this branch, and only `pr-creation-agent` commits.
- Never work on, commit to, force-push, delete remote refs on, or push `main`/`master`. `block-unsafe-ops` denies branch creation, commits, pushes and PR creation that violate this convention, pushes to any remote other than `origin`, and a PR whose owner/repo is not origin's, whose head is not the recorded feature branch, or whose base is not `main` (when hooks run).

## What is committed

| Path | Committed? | Why |
| --- | --- | --- |
| Source, tests, project docs approved at the gates | Yes | The change itself |
| `docs/sdlc/<KEY>/requirements.md`, `impl-plan.md`, `architecture.md`, `design-review.md`, `implementation-summary.md`, `code-review.md`, `verification-report.md` | Yes | Traceability of the approved artifacts |
| `docs/sdlc/<KEY>/workflow-state.json` (and its lock/tmp files) | No (gitignored) | Contains pre-final approval state and changes with every command |
| `docs/sdlc/<KEY>/pr-draft.md` | No (gitignored) | It is the PR body source and cites the commit, so it cannot be inside that commit |
| `.github/hooks/logs/` | No (gitignored) | Local audit log |
| Unrelated working-tree changes (for example `frontend/src/**`, `ThemeToggle.jsx`, `.docx` files) | No | Not part of the approved change |
| `.env*`, `.vscode/mcp.json`, keys | Never | Secrets |

Stage files by name (`git add <path> ...`). `git add -A` and `git add .` are not used. Check `git status` after staging and compare the staged list with the approved list.

## Commit message

Format: `<type>(<scope>): <summary> [workflow: sdlc-orchestrator]`, followed by a body that lists the workers that actually contributed and what they did.

```
feat(agentic-sdlc): implement documentation sync workflow [workflow: sdlc-orchestrator]

Prepared through the GitHub Copilot Agentic SDLC workflow, coordinated by the
SDLC Orchestrator Agent.

Contributions:
- requirements-analysis-agent: requirements.md for <KEY>
- implementation-agent: scripts/doc_sync and tests
- verification-agent: ran the project checks; results in verification-report.md
```

- Use a single-agent tag such as `[agent: implementation-agent]` only when the commit truly contains one worker's output; for multi-worker changes use the workflow-level tag above.
- List only agents that ran (state `attempts > 0`) and describe what each actually did.
- The Git author and committer stay as configured for the human; never alter them to impersonate anyone.
- A `Co-Authored-By:` trailer is added only for a human who genuinely co-authored the commit, at the repository owner's choice. Do not add one to claim credit that did not occur, and do not add tool or vendor trailers. Agent attribution belongs in the commit body and the PR description, never in the Git author fields.
- Never skip hooks (`--no-verify`) and never amend a published commit.
- Record the real commit with `node scripts/sdlc/sdlc.js record-commit --sha <sha> --message "<message>"` after it exists. The SHA must come from `git rev-parse`; never invent one.

## Pull request description

`pr-draft.md` starts with `Proposed commit message`, then these nine sections. `submit pr_creation` fails if any is missing or empty.

| # | Section | Guidance |
| --- | --- | --- |
| 1 | Summary | Two or three sentences: what was built and why |
| 2 | Jira Reference | Issue key and URL; if the story was pasted, say so |
| 3 | Changes Made | Each file added or modified, with the reason |
| 4 | Agent Execution Summary | The SDLC Orchestrator and each worker that ran, with its real contribution |
| 5 | Test Evidence | Actual command output, or a CI link that exists. No invented CI URL |
| 6 | Documentation Sync Results | Inconsistencies found, corrections made, validation status (`python -m scripts.doc_sync --check`) |
| 7 | Known Limitations | Unresolved findings, unsupported scenarios, checks NOT RUN or BLOCKED |
| 8 | Human Approval Record | Each gate, who approved, when (from `summary`); list outstanding approvals |
| 9 | Reviewer Checklist | Actionable checkboxes for the human reviewer |

Required attribution statement (must appear): the work was prepared through the **GitHub Copilot Agentic SDLC workflow, coordinated by the SDLC Orchestrator Agent**. A suitable line: `Agentic SDLC execution: GitHub Copilot SDLC Orchestrator with the approved specialist worker agents.`

## Truthfulness rules

- Do not credit an agent that did not run, and credit every agent that did.
- Do not claim an approval that is not in the workflow state.
- Never fabricate a commit hash, CI URL, test output, approval record or PR number.
- Do not include secrets, tokens, authentication headers or `.env` values.
- Report incomplete verification honestly (NOT RUN, BLOCKED, FAIL).

## Validate before showing the draft

```
node scripts/sdlc/validate-pr-draft.js docs/sdlc/<KEY>/pr-draft.md
```

It checks: required sections present and non-empty; the Orchestrator and Agentic SDLC attribution; no credentials; no unverifiable CI link (`actions/runs/...`); no pull request URL before one is recorded; every 40-character hash cited exists in the repository; and, using `workflow-state.json`, that agents that ran are credited and agents that did not run are not.

## Approval and publishing

1. Show the human the staged file list, the commit message and the validated PR draft.
2. The human gives explicit FINAL approval for the `pr_creation` stage, recorded by the orchestrator.
3. `node scripts/sdlc/sdlc.js can-publish` must pass.
4. Only then does `pr-creation-agent` push the branch with `git push -u origin <KEY>/<name>` (the GitHub MCP cannot push local commits; the push is hook-gated) and call `create_pull_request` with owner `shivkantkumar098`, repo `aimitra`, head = the feature branch, base `main`. The orchestrator then runs `record-pr --url <real url>`. If the GitHub MCP lacks create-PR capability, the agent stops and reports; it does not simulate.
5. The workflow ends at "PR URL reported". It never merges. A human with merge rights merges the PR to `main` later in GitHub, outside this pipeline.
