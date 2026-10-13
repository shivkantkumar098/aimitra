---
name: sdlc-planning
description: "Break accepted requirements into a minimal ordered implementation plan with dependencies, validation, and risks. Use after requirements analysis."
---
# SDLC Planning

1. Map each acceptance criterion to one or more implementation and validation steps.
2. Inspect the relevant files and identify the smallest set of components that need changes.
3. Order work by actual dependencies; call out independent tasks without inventing dependencies.
4. Select existing build/test/lint commands that verify the requested behavior; distinguish available checks from missing test coverage.
5. Identify rollout, compatibility, and data risks that apply to the change.
6. Return a concise sequenced plan and its validation matrix. Do not edit files.
