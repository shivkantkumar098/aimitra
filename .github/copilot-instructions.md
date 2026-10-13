# AiMitra Copilot Instructions

## Project context
- AiMitra is a React 18 frontend in `frontend/` and a FastAPI/Python backend in `backend/`.
- Read [README.md](../README.md) for setup and [ARCHITECTURE.md](../ARCHITECTURE.md) before changing cross-cutting behavior.
- Keep frontend API integration consistent with the existing `frontend/src/services/` and `frontend/src/hooks/` patterns; keep backend routes and service logic in their existing layers.

## Change quality
- Inspect the relevant code and existing conventions before editing. Make focused changes and preserve existing behavior outside the request.
- Validate input and report errors explicitly; do not hide failures behind broad catches or silent fallbacks.
- Never expose API keys, credentials, `.env` contents, or user data in source, logs, prompts, or PR descriptions.
- Run the narrowest useful checks. The frontend check is `npm run build` from `frontend/`; there is no configured test script. For Python-only changes, run `python -m compileall backend`.
- Do not claim a check passed unless it was run and succeeded.

## SDLC entry point
- For a complete requirements-to-pull-request workflow, invoke the **SDLC Orchestrator** in `.github/agents/sdlc-orchestrator.agent.md`.
- The orchestrator runs the specialist agents in order and does not create a PR until implementation has passed independent code review.
- Follow `.github/instructions/sdlc-workflow.instructions.md` when changing workflow customizations.
