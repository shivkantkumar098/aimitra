---
name: Architecture Artifact Instructions
description: Defines repository conventions and quality rules for architecture documents.
applyTo: ".github/AgentOutput/**/*.md"
---

# Architecture Artifact Rules

- Save architecture documents to `.github/AgentOutput/<JIRA_ISSUE_KEY>/architecture.md`.
- Use the actual Jira issue key from workflow context or verified requirements metadata.
- Base decisions on approved requirements and repository evidence.
- Use Mermaid diagrams and consistent Markdown headings where appropriate.
- Identify proposed components and distinguish them from existing implementation.
- Maintain traceability to requirement IDs.
- Document assumptions, risks, dependencies, and technology trade-offs.
- Mark unknown information as `Not Found` rather than guessing.
- Never expose secrets, credentials, API keys, access tokens, or `.env` values.
- Preserve unrelated artifacts and obtain approval before finalizing the architecture document.
- Never commit or push without explicit user authorization.
