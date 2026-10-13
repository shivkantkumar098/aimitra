---
description: "Rules for the Automated Documentation Sync tool and the docs it generates."
applyTo: "scripts/doc_sync/**,tests/doc_sync/**,ARCHITECTURE.md,README.md"
---
- Python stdlib only. Sources of truth: `backend/routes/*.py`, `backend/services/*`, `frontend/src/utils/capabilities.js`.
- Generated content sits between `doc-sync` marker comments. Do not hand-edit it; change the code or the generator, then run `python -m scripts.doc_sync`.
- Write `Not Found` for fields that cannot be determined from code; never guess.
- Empty or missing source folders must give a clear message, not a crash.
- Redact secret-like values and never read `.env` files.
- Verify with `python -m unittest discover -s tests/doc_sync -t .` and `python -m scripts.doc_sync --check`.
