# AiMitra Copilot Instructions

These are the shared rules for all agents. Agent files and skills reference this file instead of repeating it.

## Project purpose
- AiMitra is a React 18 frontend (`frontend/`) and a FastAPI backend (`backend/`). See `README.md` and `ARCHITECTURE.md`.
- This repo also hosts the Agentic SDLC capstone for **Automated Documentation Sync**: one `sdlc-orchestrator` coordinating eight workers (`.github/agents/`), with state and tooling in `scripts/sdlc/` and the sync tool in `scripts/doc_sync/`.

## Repository conventions
- Follow existing layering: backend routes in `backend/routes/`, services in `backend/services/`; frontend hooks/services under `frontend/src/`.
- Make focused changes. Preserve existing behavior and do not refactor unrelated code.
- SDLC artifacts live in `docs/sdlc/<ISSUE-KEY>/`; stage contracts are defined in `scripts/sdlc/lib/stages.js`.

## SDLC and human-in-the-loop
- Stage order: requirements, planning, architecture, design_review, implementation, code_review, verification, pr_creation. Never skip or reorder.
- Human approval is mandatory at every stage. Worker completion, silence, prior approvals, generated artifacts, passing tests, or a recommendation are never approval.
- Only the orchestrator records state through `node scripts/sdlc/sdlc.js`. Workers never run `start`, `submit`, or `approve`.
- A changed artifact needs renewed approval. Rejection stops downstream work.

## Security and secrets
- Never read, print, copy, or commit `.env` files, API keys, or the token values in `.vscode/mcp.json`. Use `${input:...}` prompts for tokens.
- Never put credentials in artifacts, logs, state files, commit messages, or PR descriptions.

## Testing expectations
- `node --test tests/sdlc`
- `python -m unittest discover -s tests/doc_sync -t .`
- `python -m scripts.doc_sync --check`
- `cd frontend && npm run build` (no frontend test script exists)
- `python -m compileall backend`
- Run only what is relevant, and report real results.

## Documentation synchronization
- Generated doc blocks are derived from code (`backend/routes`, `backend/services`, `frontend/src/utils/capabilities.js`). Edit the code or the generator, not generated blocks.
- Undeterminable fields are written as `Not Found`; never guess. Empty or missing folders produce a clear message. Never include secrets.

## Git and branch safety
- Every change is made on its own branch named `<ISSUE-KEY>/<feature-name>` (lowercase kebab-case, 3-50 chars), for example `DOC-SYNC-001/documentation-sync`. The orchestrator creates it from up-to-date `main` (`git switch -c <KEY>/<name>`) before the `implementation` stage starts; the workflow state records it and `can-publish` requires HEAD to still be on it. Never work on or push `main`/`master`.
- Never force-push, reset hard, or merge a PR. Never push or create a PR before the final human approval. Only `origin` is used.
- Stage files by name. Unrelated uncommitted changes (for example `frontend/src/**`, `ThemeToggle.jsx`, `.docx` files) must never be staged.
- Commit author metadata stays truthful; agent attribution goes in the commit message, PR description, and workflow records.

## Evidence-based reporting
- Do not claim a check passed unless it was run and succeeded. Show commands and actual output. Use PASS, FAIL, BLOCKED, or NOT RUN.
- Report limitations and unexecuted checks honestly.

## MCP usage
- Use the connected Jira and GitHub MCP servers only for their documented purposes. Discover tools before use.
- Jira is read-only unless separately authorized. If a tool is unavailable, say so; never simulate a remote result.
- Verify tool names (`Atlassian-MCP/*`, `github/*`) against the installed server names. The server keys in `.vscode/mcp.json` must be exactly `github` and `Atlassian-MCP`; `.github/mcp.example.json` is the credential-free template (copy it to `.vscode/mcp.json`; values come from prompt inputs, never from files).
- Target repository for the pull request: `shivkantkumar098/aimitra` (the existing `origin`; no other remote is used), base branch `main`, head = the recorded feature branch `<ISSUE-KEY>/<feature-name>`. The GitHub MCP server cannot push local commits, so the branch is pushed with `git push -u origin <ISSUE-KEY>/<feature-name>` (the `block-unsafe-ops` hook allows it only after final approval) and the PR is then created with the MCP `create_pull_request` tool (owner `shivkantkumar098`, repo `aimitra`, base `main`). The workflow ends at "PR URL reported"; a human with merge rights merges to `main` later in GitHub, outside this pipeline.

## Attribution
- Name the SDLC Orchestrator and only the workers that actually contributed, with their real contributions.

## Prohibited
- Fabricating test results, approvals, commit hashes, CI links, PR numbers, or Jira data.
- Merging any PR, or creating one without explicit final approval.
