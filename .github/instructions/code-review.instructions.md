---
name: Code Review Instructions
description: Defines artifact storage and integrity rules for code review.
applyTo: ".github/AgentOutput/**/*.md"
---

# Rules
- Save review results to `.github/AgentOutput/<JIRA_ISSUE_KEY>/code-review.md`.
- Use the validated issue key and the matching artifact directory.
- Base findings on actual code, diffs, test results, or scan evidence.
- Review all seven required areas.
- Do not modify production code during the review.
- Do not include secrets, API keys, tokens, or `.env` values.
- Preserve existing artifacts and unrelated content.
- Verify the report before claiming completion.
- Do not commit, push, or create a PR.