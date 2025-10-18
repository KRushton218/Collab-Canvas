## PR-1: Add cursor_flow orchestrator (time budgets, depth, parallel attempts)

### Metadata
- **Feature/Fix Name**: cursor_flow orchestrator
- **Scope**: `.cursor/rules/*`, `NEXT_AGENT_HANDOFF.md`
- **Test Strategy**: Lint rules files, dry-run usage by referencing rule in workflows

### Subtasks
1. [x] Create `cursor-flow.mdc` orchestrator rule
   - Files: `.cursor/rules/cursor-flow.mdc` (new)
2. [x] Integrate into development workflows
   - Files: `.cursor/rules/development-workflow.mdc` (edit), `.cursor/rules/development-workflow-and-code-review.mdc` (edit), `.cursor/rules/bugfix-workflow.mdc` (edit), `.cursor/rules/git-workflow.mdc` (edit)
3. [x] Document usage for agents
   - Files: `NEXT_AGENT_HANDOFF.md` (edit)
4. [ ] Verify lint passes for modified rules
   - Files: all above (lint)
5. [ ] Open PR and request review
   - Files: n/a

### Verification Approach
- Open edited MDC files to ensure no syntax errors and headings render
- Confirm `cursor_flow` section appears in each modified rule
- Ensure `NEXT_AGENT_HANDOFF.md` shows example envelopes and guidance

### Notes
- Default envelopes: fix=20m standard depth; feature/perf=40m, balanced/deep as appropriate
- Parallel attempts only for read-only exploration; sequence edits to avoid conflicts

