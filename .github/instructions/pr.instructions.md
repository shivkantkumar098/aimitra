---
name: PR Instructions
description: Defines storage, evidence, and authorization rules for Pull Request preparation.
applyTo: ".github/AgentOutput/**/*.md"
---

# Rules
- Save the preparation artifact to `.github/AgentOutput/<JIRA_ISSUE_KEY>/pr-summary.md`.
- Use the validated Jira issue key and matching artifact directory.
- Base descriptions on actual diffs and verified artifacts.
- Include all five required PR description sections.
- Include a changelog entry and reviewer checklist.
- Never fabricate test evidence, CI links, file changes, or PR URLs.
- Do not include secrets, API keys, tokens, or `.env` values.
- Require explicit user authorization before creating a PR.
- Do not bypass failed required checks without an explicitly approved exception.
- Preserve unrelated files and existing artifacts.