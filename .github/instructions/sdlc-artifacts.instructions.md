---
description: "Rules for SDLC artifacts and workflow state under docs/sdlc."
applyTo: "docs/sdlc/**"
---
- Each run lives in `docs/sdlc/<ISSUE-KEY>/`. Artifact names and required sections come from `scripts/sdlc/lib/stages.js`; a missing or empty required section fails `submit`.
- `workflow-state.json` is written only by `node scripts/sdlc/sdlc.js`. Never hand-edit it or an approval.
- Never include secrets, tokens, or personal data in artifacts.
- Editing an approved artifact makes it STALE; it needs resubmission and fresh human approval.
- State only verified facts. Mark unknowns as unresolved questions, not assumptions.
