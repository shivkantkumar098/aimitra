---
name: Design Review Artifact Instructions
description: Defines storage and integrity rules for design review artifacts.
applyTo: ".github/AgentOutput/**/*.md"
---

# Rules
- Store review output at `.github/AgentOutput/<JIRA_ISSUE_KEY>/design-review.md`.
- Read `requirements.md` and `architecture.md` from that same issue directory.
- Obtain the issue key from validated workflow context or approved artifacts; never invent it.
- Update `architecture.md` only after agreement on material changes.
- Preserve unrelated content and existing artifacts.
- Do not include secrets, API keys, tokens, or `.env` values.
- Verify saved files before reporting success.
- Do not commit or push without explicit authorization.