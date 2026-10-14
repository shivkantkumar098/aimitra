---
name: Implementation Instructions
description: Defines rules for implementing approved tasks and recording implementation evidence.
applyTo: "**/*"
---

# Rules
- Follow the approved `impl-plan.md` and its dependency order.
- Obtain human approval for each task or clearly defined implementation batch before editing production code.
- Do not start blocked tasks.
- Keep changes scoped to the approved task.
- Follow repository conventions and approved architecture.
- Add or update tests for changed behavior.
- Never include secrets, API keys, tokens, or `.env` values in code or generated output.
- Record actual changes and test results in `.github/AgentOutput/<JIRA_ISSUE_KEY>/implementation-notes.md`.
- Preserve unrelated files and user changes.
- Do not commit, push, or create a PR without explicit authorization.