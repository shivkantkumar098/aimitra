---
name: verification
description: Verifies implementation behavior, test coverage, error handling, and generated documentation quality.
---

# Verification Process

## 1. Test Discovery
- Inspect existing unit and integration tests.
- Identify available test runners and project commands.
- Map requirements and acceptance criteria to verification cases.

## 2. Code Verification
- Run relevant unit tests.
- Run integration tests where the environment supports them.
- Run available linting, type checking, and static analysis.
- Record commands, exit codes, and actual outcomes.

## 3. Edge-Case Verification
Verify appropriate cases, including:
- Missing source files or directories
- Empty source directories
- Missing route, provider, or feature metadata
- Missing fields represented as `Not Found`
- Invalid inputs and API failures, where applicable
- Secret and environment-variable exclusion

## 4. Documentation Quality
- Confirm README feature entries are supported by `frontend/src/utils/capabilities.js` and verified project metadata.
- Confirm ARCHITECTURE route information is derived from `backend/routes/*.py`.
- Confirm provider information is derived from `backend/services/*`.
- Validate required table headers, ordering, and Markdown formatting.
- Confirm only designated generated sections are updated.
- Run generation twice against an unchanged source snapshot and compare outputs for determinism.

## 5. Final Assessment
Classify each check as:
- Passed
- Failed
- Blocked
- Not Verified

Do not mark a check Passed without execution or verifiable evidence.

# Required Output: verification-report.md

## 1. Verification Summary
Overall status and scope.

## 2. Environment
Relevant tools, dependencies, and limitations.

## 3. Commands Executed
Command, purpose, exit code, and actual result.

## 4. Unit Test Results
Results and uncovered cases.

## 5. Integration Test Results
Results and environmental blockers.

## 6. Documentation Quality Checks
Source accuracy, section preservation, formatting, and determinism.

## 7. Security and Error-Handling Checks
Secret exclusion, input validation, and failure scenarios.

## 8. Outstanding Issues
Failures, blockers, and unverified checks.

## 9. Final Verdict
Verified, Failed, or Blocked, with justification.