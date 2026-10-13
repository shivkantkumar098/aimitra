---
name: implementation
description: "Implement a reviewed and scoped AiMitra change using repository patterns, focused edits, and relevant validation."
---
# Implementation

1. Read the approved requirement, plan, architecture, and design handoffs before editing.
2. Inspect target files and nearby examples; make the smallest complete change that meets acceptance criteria.
3. Preserve unrelated changes in the shared worktree. Never stage, commit, or push during implementation.
4. Reuse existing React hooks/services and FastAPI route/service boundaries. Validate untrusted inputs and surface errors explicitly.
5. Run the narrowest available checks: frontend `npm run build` from `frontend/`; for Python-only changes `python -m compileall backend`. Run relevant tests if present.
6. Report changed files, criteria met, exact checks and results, and remaining risks. Never claim an unrun check passed.
