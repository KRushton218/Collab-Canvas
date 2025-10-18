### feature/evaluator-tests-pr-1 — Branch Genesis

This branch creates a preserving, test-driven evaluation workflow for `scripts/evaluate-canvas-approaches.ts`, ensuring that every test pathway is implemented, with explicit documentation and commit preservation.

### Scope
- Define and implement npm scripts backing evaluator checks: performance, realtime collaboration, and code quality.
- Harden evaluator branch switching and result persistence.
- Provide documentation, tasks, and verification steps.

### How to Run
- Evaluate: `npm run swarm:evaluate -- --session <sessionId>`
- Performance suite: `npm run test:performance`
- Realtime suite: `npm run test:realtime`
- Code quality: `npm run lint && npm run test`

### Task List
- [ ] Create `tests/performance/` with targeted vitest benchmarks and thresholds
- [ ] Create `tests/realtime/` simulating multi-client sync via jsdom and Firebase mocks
- [ ] Wire npm scripts: `test:performance`, `test:realtime`, update `test`
- [ ] Update evaluator to stash/restore, capture original branch, and persist artifacts
- [ ] Add `docs/evaluator/RESULTS-<sessionId>.json` artifact write and summary table
- [ ] Add PR task file `docs/tasks-evaluator-tests-pr-1.md` with subtasks and test strategy
- [ ] Document preserving git flow (merge commits, no-ff) in README and tasks file
- [ ] Add CI-friendly exit codes on thresholds (non-zero on failure)

### Preserving Git Operations
- Always use merge commits when integrating into `develop`: `git merge --no-ff <branch> -m "Merge <branch>: <summary>"`
- Never squash when merging evaluation work; keep descriptive commit messages.
- Before merges, update branch from base with merge commits: `git fetch && git merge --no-ff origin/develop`

### Verification
- All suites pass locally without fallback scoring.
- Evaluator restores the original branch and stash is reapplied.
- Results artifact exists and matches console output.

### Research
- See `BRANCH_GENESIS/RESEARCH.md` for ongoing documentation and findings.