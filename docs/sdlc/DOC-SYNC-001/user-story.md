# DOC-SYNC-001 — user story (sample input)
Source: pasted (sample for the capstone; replace with your real Jira/Confluence/Word story)
---
**As a** developer on AiMitra,
**I want** project documentation (README feature list, ARCHITECTURE route/provider tables) to be regenerated from the code,
**so that** documentation never drifts from what the backend routes, providers and frontend capabilities actually do.

Notes:
- Source of truth: `backend/routes/*.py`, `backend/services/*`, `frontend/src/utils/capabilities.js`.
- If a field cannot be determined from code (e.g. a route has no docstring), the document must say `Not Found` instead of guessing.
- Secrets, API keys and `.env` values must never appear in the generated document.
- An empty or missing source folder must produce a clear message, not a crash.
