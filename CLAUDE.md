# CLAUDE.md — ASL Drill

ASL Drill is a browser-based fingerspelling trainer. **Read `SPEC.md` first.** It defines what to build, what is out of scope, the key technical decisions, and the milestones.

## How to work

- Work on **one milestone from SPEC.md at a time**, in order. Start each milestone by proposing a plan and waiting for approval.
- Do not build Phase 2 features unless asked. If something in the spec seems wrong or blocks progress, stop and ask rather than working around it.
- Keep changes small: one feature per branch, one PR per feature.
- If a decision is not covered by SPEC.md and is hard to undo (new dependency, data format, architecture change), ask first. Small implementation choices are yours to make.

## Shipping

- After each completed feature, once tests, lint, and typecheck pass locally, run the `/ship` skill to commit, push, open a PR, wait for CI, and merge.
- **Never push or merge with failing tests.**
- Commit messages follow conventional commits (`feat:`, `fix:`, `test:`, `chore:`, etc.) and explain *why*, not just *what*.
- **Deploys:** this project deploys through Vercel's GitHub integration, not a GitHub Actions deploy workflow. For the deploy step of `/ship`, check the Vercel deployment status on the merge commit (e.g. `gh api repos/{owner}/{repo}/commits/{sha}/status` or the Vercel check on the PR) instead of `gh run watch`. Report the result.

## Safety

This project may run with permission prompts disabled. So:
- Only touch files inside this repository.
- No destructive git operations (force push, history rewrites, deleting branches you did not create) without asking.
- Never commit secrets, `.env` files, or raw training datasets.

## Code conventions

- TypeScript strict mode. No `any` without a comment explaining why.
- Keep logic out of components: put it in pure modules (`lib/`) and custom hooks, so components stay presentational.
- Core logic (normalization, letter confirmation, motion detection, stats) must be pure functions or state machines that can be tested without a camera.
- Tailwind for styling. Design aims for Monkeytype: minimal, fast, keyboard-friendly, dark-mode first.

## Testing

- Jest unit tests for all core logic. Every feature ships with tests.
- Normalization and classifier inference are tested against shared fixtures in both TypeScript and Python, so training and the app never drift apart.
- Do not try to test MediaPipe or the camera directly. Test the code that consumes their output, using recorded landmark fixtures.

## Training (`/training`)

- Python code for preparing data, training the classifier (scikit-learn), and exporting it as a JSON model that the app runs in plain TypeScript.
- Raw datasets live in `/training/data/` and are gitignored. The exported model used by the app is committed.
- Training output should report per-letter accuracy and the most-confused letter pairs.
