### Research Log — feature/evaluator-tests-pr-1

#### Purpose
Centralize research, references, and decisions for the Evaluator Tests PR-1. This log tracks sources, findings, alternatives considered, and concrete decisions that influence implementation.

#### Index
- Context and Goals
- Open Questions
- Key Findings
- Decisions
- Next Steps
- References

#### Context and Goals
- Establish deterministic evaluator tests for performance, realtime collaboration, and code quality.
- Preserve git history across evaluation workflows; ensure branch safety and result persistence.

#### Open Questions
- What performance thresholds are realistic for canvas operations given current architecture?
- How to simulate multi-client realtime behavior reliably in tests (Firebase mocks vs. lightweight emulation)?

#### Key Findings
- The app’s two-database architecture (Firestore persistence + RTDB live state) underpins all collaboration tests; batching drastically reduces operations for multi-select and transforms.
- Recent performance work established practical targets: sub-200ms batch operations, RTDB-first previews, and O(visible) rendering via viewport culling.
- Preserving git operations are required for evaluator workflows (merge commits, no-ff) and should be validated as part of evaluator behavior.

#### Decisions
- Focus evaluator on three dimensions with hard gates:
  1) Performance (time + operation count thresholds)
  2) Realtime collaboration (latency + correctness under locks)
  3) Code quality (lint/tests must pass)
- Persist every evaluation to a JSON artifact and echo a human summary for auditability.

#### Next Steps
- Draft performance test plan and metrics.
- Define realtime sync scenarios and fixtures.
- Align npm scripts and vitest setup with CI expectations.

#### Rubric-Aligned Baseline
- Performance: initial render, paste/duplicate, multi-drag complete, z-index batch, arrow movement; targets informed by existing docs (sub-200ms typical, single Firestore transaction for batch commits).
- Collaboration: lock TTL/heartbeat, all-or-nothing multi-lock acquisition, RTDB-first preview, conflict handling (LWW for properties), presence/idle accuracy.
- Quality: ESLint clean, unit tests green, type-level checks where applicable, deterministic outputs.

#### Evaluation Dimensions and KPIs
- Performance KPIs (headless/vitest):
  - Paste 50 shapes completes < 200ms; 100 shapes < 400ms (local env).
  - Multi-drag completion single Firestore batch; RTDB+Firestore = 2 network calls.
  - Arrow movement batched; no N-per-shape writes.
  - Render scope O(visible); verify culling reduces off-screen node count.
- Realtime/Collab KPIs:
  - RTDB-first preview latency < 200ms; Firestore commit eventual consistency without “ghost” regressions.
  - Locks: shared heartbeat every ~4s; TTL ~15s; batch acquire/release success under contention.
  - Presence: idle after 5m; tab-focused heartbeat at 30s; stale session modal after 1h.
- Code Quality Gates:
  - `npm run lint` with zero errors; `npm test` 100% pass.
  - Deterministic evaluator run: no fallback scoring paths triggered.

#### Test Plan Outline (to implement)
- tests/performance/
  - paste_duplicate.spec: measure time + assert single Firestore batch path invoked.
  - multi_drag_complete.spec: assert RTDB preview then Firestore commit, both batched.
  - viewport_culling.spec: assert visible-only rendering based on mock viewport.
- tests/realtime/
  - locks_batching.spec: acquire/release multi-locks, verify TTL/heartbeat behavior.
  - presence_idle.spec: simulate activity/visibility, assert idle and stale flows.
  - rtdb_first_preview.spec: verify preview-before-commit ordering and no ghost shapes.
- tests/quality/
  - lint run as a step; unit tests cover selection, text, presence, shapes services.

#### Artifacts and Reporting
- JSON artifact: `docs/evaluator/RESULTS-<sessionId>.json` capturing KPIs, pass/fail, timings, and commit refs.
- Console summary table matching artifact; non-zero exit on any gate failure.

#### Risks / Open Questions
- Headless timing variance across machines; mitigate via generous but meaningful thresholds and relative checks.
- Firebase mocking fidelity for RTDB timing semantics; may require lightweight in-memory emulation for heartbeat/TTL.

#### Immediate Actions
- Create `tests/performance/` and `tests/realtime/` scaffolds.
- Wire npm scripts: `test:performance`, `test:realtime`, and ensure evaluator calls them in order.
- Implement artifact writer and evaluator stash/restore + branch-return safeguards.

#### References
- See `BRANCH_GENESIS/PROBLEM_STATEMENT.md` and `BRANCH_GENESIS/README.md`.

