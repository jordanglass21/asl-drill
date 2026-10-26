---
name: ship
description: Commit, push, PR, watch CI, merge to main, clean up worktree/branches, pull, watch deploy
---

Ship the current work end-to-end. Run these steps in order and STOP if any step fails or reveals something unexpected — report and wait, don't paper over it.

An optional PR title / commit summary may be passed as arguments: $ARGUMENTS
(If the arguments are empty or just the word "it", ignore them and derive the title from the commit.)

## 1. Commit
- Run `git status` and `git diff` (staged + unstaged) and `git log -5` to see the changes and match the repo's commit style.
- Confirm you're in a dedicated worktree/branch, NOT directly on a shared `main`. If HEAD, the branch, or the working tree contains anything you did not author, STOP and ask.
- Stage ONLY the files you created or edited, by explicit path. NEVER `git add -A`, `git add .`, or `git commit -a`.
- Write one conventional-commit message (feat:/fix:/etc. per history). End it with the harness's Co-Authored-By trailer.

## 2. Push
- Push the current branch to origin, setting upstream if needed (`git push -u origin HEAD`).

## 3. Create the PR
- `gh pr create` with a title (use $ARGUMENTS if a real title was given, else derive from the commit) and a short body summarizing the change. End the body with the Claude Code attribution line.
- Print the PR URL.

## 4. Watch tests
- `gh pr checks --watch` until CI settles.
- If any required check fails, STOP, show the failing output, and wait — do not merge.

## 5. Merge + clean up
- Only once checks are green: squash-merge (`gh pr merge --squash`), matching how this repo merges.
- NOTE: from a worktree `gh pr merge` may error locally ("main is already used by worktree") even though the REMOTE merge succeeded. If that happens, verify the PR is actually merged (`gh pr view --json state,mergedAt`) before treating it as a failure.
- Delete the remote branch and the local branch.
- Remove the worktree for this work (`git worktree remove`) and prune (`git worktree prune`).

## 6. Pull main to local
- In the primary checkout, fast-forward `main` to the merged remote (`git fetch origin` + `git pull --ff-only origin main`), so local matches remote.

## 7. Watch the deploy
- Find and watch the deploy triggered by the merge (e.g. `gh run watch` on the deploy workflow run for the merge commit).
- Report the final deploy status. If it fails, surface the logs.

At the end, give a one-line summary: PR link, merge status, deploy status.
