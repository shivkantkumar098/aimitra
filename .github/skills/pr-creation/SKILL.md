---
name: pr-creation
description: "Prepare and publish a GitHub pull request after independent code review passes, while protecting unrelated worktree changes."
---
# Pull Request Creation

1. Require a review handoff with `PASS`; inspect the diff, current branch, default branch, configured remote, and worktree status yourself.
2. Ensure only the reviewed task changes are included. Never use `git add -A` or stage unrelated/untracked files.
3. Do not commit or push from the default branch. If a dedicated branch or cleanly isolated changes are not available, stop and ask the user before changing branch or staging state.
4. Confirm relevant checks passed, or clearly report any unavailable checks; never conceal failures.
5. Create the PR using the authenticated GitHub integration when available, otherwise `gh pr create`. Use a concise title and a body with context, change summary, validation, and review status.
6. Do not force-push, bypass branch protections, or include credentials/private data. If authentication or permissions fail, report the blocker without retrying via another identity.
7. Return the PR URL, base/head branches, summary, and checks status.
