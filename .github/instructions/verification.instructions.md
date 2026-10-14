---
name: Verification Instructions
description: Defines storage and integrity rules for verification reports.
applyTo: ".github/AgentOutput/**/*.md"
---

# Rules
- Save results to `.github/AgentOutput/<JIRA_ISSUE_KEY>/verification-report.md`.
- Use the validated Jira issue key and matching artifact directory.
- Verify the actual implementation and generated documentation.
- Record real commands, outcomes, and limitations.
- Never fabricate test evidence or mark blocked checks as passed.
- Do not include secrets, tokens, API keys, or `.env` values.
- Preserve unrelated files and existing artifacts.
- Verify the report before claiming completion.
- Do not commit, push, or create a PR.