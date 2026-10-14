# Requirements — AG-4: AiMitra-1

## Jira reference

- **Issue:** [AG-4 — AiMitra-1](https://shivkantkr.atlassian.net/browse/AG-4)
- **Type / status:** Story / To Do
- **Source:** Jira issue description (retrieved); user-confirmed scope, decisions, and error contract.
- **Jira description:** Regenerate project documentation from code so it does not drift from backend routes, providers, and frontend capabilities.

## Business objective and scope

Keep the README feature list and ARCHITECTURE route/provider tables accurate by generating their designated sections from authoritative code and verified project metadata. Provide an explicit regeneration command and a CI check that detects stale documentation without changing files. Preserve all content outside generated sections.

**In scope:** `backend/routes/*.py`, `backend/services/*`, `frontend/src/utils/capabilities.js`, verified project metadata, generated sections in `README.md` and `ARCHITECTURE.md`, and the documented `scripts.doc_sync` write/check commands.

**Out of scope:** Inferring broader workspace or tool capabilities without an authoritative source; treating unrelated backend services as AI providers; automatic documentation rewrites by CI; and performance targets not specified by the story.

## Functional requirements

- **FR-001 — Source inventory:** Read backend route modules from `backend/routes/*.py`, service modules from `backend/services/*`, frontend capabilities from `frontend/src/utils/capabilities.js`, and verified project metadata as documentation inputs.
- **FR-002 — README features:** Generate the README feature content from `capabilities.js` and verified project metadata only. Do not infer workspace/tool features or other capabilities without an authoritative source.
- **FR-003 — Route table:** Generate the ARCHITECTURE route table from route definitions in `backend/routes/*.py`. For any field that cannot be determined from code, render the exact text `Not Found`; do not guess.
- **FR-004 — AI-provider table:** Include AI-provider modules found in `backend/services/*` in the ARCHITECTURE provider table. Do not classify unrelated services as AI providers. For any provider-table field that cannot be determined from code, render the exact text `Not Found`; do not guess.
- **FR-005 — Explicit generation:** Support regeneration through `python -m scripts.doc_sync --write`.
- **FR-006 — Stale-documentation check:** Support `python -m scripts.doc_sync --check` for detecting when generated documentation differs from current source. The check must not write or overwrite documentation.
- **FR-007 — Bounded updates:** Update only content within designated generated sections in `README.md` and `ARCHITECTURE.md`. Preserve all content outside those sections.
- **FR-008 — Marker validation:** If a required generated-section marker is missing, stop with a clear error and do not overwrite the document.
- **FR-009 — Secret exclusion:** Never include secrets, API keys, or `.env` values in generated documentation.

## Non-functional requirements

- **NFR-001 — Actionable failure behavior:** Failures must produce clear, actionable messages and non-zero exit codes.
- **NFR-002 — Robustness:** Gracefully handle missing or empty source folders, source parse errors, and missing documentation markers. Do not crash with an unhandled exception or silently produce incomplete documentation.
- **NFR-003 — Change safety:** Neither the check command nor a failed generation may silently overwrite documentation; content outside the designated generated sections remains unchanged.
- **NFR-004 — Performance target:** Not Found. No performance target is specified.

## Acceptance criteria

- **AC-001:** Running `python -m scripts.doc_sync --write` generates README feature content using `capabilities.js` and verified project metadata, without inventing broader workspace/tool features.
- **AC-002:** The ARCHITECTURE route table reflects routes found in `backend/routes/*.py`; fields not determinable from code display exactly `Not Found`.
- **AC-003:** The ARCHITECTURE provider table includes AI-provider modules in `backend/services/*`, excludes unrelated services, and displays exactly `Not Found` for any field not determinable from code.
- **AC-004:** `python -m scripts.doc_sync --check` detects stale generated content, returns a non-zero exit code when stale, and does not modify either documentation file.
- **AC-005:** A successful `--write` changes only designated generated sections in `README.md` and `ARCHITECTURE.md`; all other content is preserved.
- **AC-006:** A missing required marker causes a clear error and non-zero exit code; the affected document is not overwritten.
- **AC-007:** Missing or empty required source folders are handled with a clear message and non-zero exit code, without an unhandled exception or silently incomplete documentation.
- **AC-008:** A source parse error is reported clearly with a non-zero exit code; generation does not silently emit incomplete documentation.
- **AC-009:** Generated output contains no secrets, API keys, or `.env` values.
- **AC-010:** All command failures provide actionable messages and non-zero exit codes.

## Business and validation rules

- **BR-001 — Authoritative inputs:** Document only facts established from the specified source code or verified project metadata. Do not infer unsupported facts.
- **BR-002 — Unknown values:** When a documented field cannot be determined from code, its value is exactly `Not Found`.
- **BR-003 — Provider classification:** A service is included in the provider table only when it is an AI-provider module; unrelated service modules are excluded.
- **BR-004 — Write boundary:** Only designated generated sections may be changed. Missing markers invalidate the write operation.
- **BR-005 — CI boundary:** The `--check` operation detects drift only and never writes files.
- **BR-006 — Sensitive data:** Secrets, API keys, and `.env` values are prohibited in generated documentation.

## Error scenarios and edge cases

| Scenario | Required behavior |
|---|---|
| Required source folder is missing or empty | Clear actionable message; non-zero exit; no unhandled exception and no incomplete generated output. |
| Source file cannot be parsed | Clear parse-error message; non-zero exit; do not silently generate incomplete documentation. |
| Required generated-section marker is absent | Clear marker error; non-zero exit; do not overwrite the document. |
| `--check` finds stale content | Report stale documentation and return non-zero; do not modify files. |
| Documented field is not determinable from code | Emit exactly `Not Found` for that field rather than guessing. |
| Source contains sensitive values | Do not include secrets, API keys, or `.env` values in generated output. |

## Dependencies and constraints

- Required source inputs: `backend/routes/*.py`, `backend/services/*`, and `frontend/src/utils/capabilities.js`; README feature generation also uses verified project metadata.
- Target documentation: designated generated sections in `README.md` and `ARCHITECTURE.md`. The existing marker sections and command baseline are confirmed.
- Commands: `python -m scripts.doc_sync --write` (explicit regeneration) and `python -m scripts.doc_sync --check` (read-only CI validation).
- CI must not overwrite documentation automatically.
- No performance target is specified.

## Assumptions

- **A-001 (confirmed baseline):** `README.md` and `ARCHITECTURE.md` have designated generated sections, and the commands above are the intended interface. Existing repository documentation contains doc-sync markers for capability modes, routes, and services.
- **A-002 (scope clarification):** “Verified project metadata” means metadata that can be authoritatively established from project sources; no additional metadata source or fields are specified.
- No other assumptions are required to express the confirmed scope.

## Unresolved questions

None. The material scope and behavior questions were resolved and explicitly approved by the user.

## Requirements traceability matrix

| Requirement | Acceptance criteria |
|---|---|
| FR-001 | AC-001, AC-002, AC-003 |
| FR-002 | AC-001 |
| FR-003 | AC-002 |
| FR-004 | AC-003 |
| FR-005 | AC-001, AC-005 |
| FR-006 | AC-004 |
| FR-007 | AC-005 |
| FR-008 | AC-006 |
| FR-009 | AC-009 |
| NFR-001 | AC-010 |
| NFR-002 | AC-006, AC-007, AC-008 |
| NFR-003 | AC-004, AC-005, AC-006 |
| NFR-004 | Not applicable; target is unspecified. |
| BR-001 | AC-001, AC-002, AC-003 |
| BR-002 | AC-002, AC-003 |
| BR-003 | AC-003 |
| BR-004 | AC-005, AC-006 |
| BR-005 | AC-004 |
| BR-006 | AC-009 |

## Approval status

**Approved by the user.** The requirements and clarifications were explicitly approved before this artifact was written.
