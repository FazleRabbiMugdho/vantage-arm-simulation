# AGENTS.md — Vantage Robotics Simulation Suite

## OpenCode agents configuration

This file documents the agent configuration and conventions used when building this project with OpenCode (DeepSeek).

### Mode conventions
- **Plan mode** (Tab to toggle): Prompts 0, 1, 6, 7, 14 — architecture-defining steps where a proposal is reviewed before code is written.
- **Build mode**: All other prompts — direct implementation.

### Tool assignment
- **OpenCode / DeepSeek**: Prompts 0–12 and 14–17 (structural/logic — all TypeScript, Three.js, Next.js, IK math, Web Speech API, deployment, docs).
- **Antigravity**: Prompt 13 (visual design pass — CSS/styling/UX polish only, no logic changes).

### Commit discipline
- Commit after every prompt using the exact commit message specified in OPENCODE_BUILD_PROMPTS.md.
- Run `/check-secrets` before any commit touching `.env` or config files.
- Each commit is a restore/undo checkpoint.

### Verification
- After each prompt, run that step's verification checklist before committing.
- If a checklist item fails, report the failure to the agent and ask it to fix that specific item — do not proceed to the next prompt with a known-broken step.

### Branching & naming convention
- **Branch names**: use professional kebab-case names, not `prompt-XX`.
  - Examples: `key-panel`, `ik-solver`, `voice-control`, `deploy-readiness`.
- **Audit files**: `docs/audit-<name>.md` matching the branch name.
- **Create a new branch** for every prompt before starting work: `git checkout -b <name>`
- **Push the branch** to GitHub: `git push -u origin <name>`
- **Create a Pull Request** on GitHub from the branch into `master` — merge via PR, not direct merge.
- **Keep all branches** — never delete them locally or remotely. This preserves full history per prompt.
- After the PR is merged, switch back to master and pull: `git checkout master && git pull`
- This keeps each prompt's work isolated, enables PR review, and gives a clean `/undo` path.

### Professional branch name map

| Prompt | Name |
|--------|------|
| 0 | `context-primer` |
| 1 | `architecture-plan` |
| 2 | `scaffold` |
| 3 | `urdf-viewer` |
| 4 | `key-panel` |
| 5 | `telemetry-dashboard` |
| 6 | `ik-solver` |
| 7 | `motion-controller` |
| 8 | `joystick-control` |
| 9 | `keyboard-control` |
| 10 | `autonomous-pin-entry` |
| 11 | `voice-control` |
| 12 | `unify-dashboard` |
| 13 | `visual-design` |
| 14 | `agentic-bonus` |
| 15 | `deploy-readiness` |
| 16 | `judge-documentation` |
| 17 | `electrical-schematic` |

### Audit file requirement
- After every prompt (both Plan and Build mode), create an audit file at:
  `docs/audit-prompt-XX.md` where `XX` is the zero-padded prompt number (e.g. `04`, `05`).
- Use this template:

```md
# Audit: Prompt XX — [Title]

**Mode:** Plan / Build
**Date:** YYYY-MM-DD
**Branch:** prompt-XX
**Commit:** `[commit message]` ([hash])

## What was done
[Summary of work — 3-5 bullet points]

## Problems solved
[Any bugs, build errors, or unexpected issues and their fixes]

## Verification checklist
- [ ] Item 1
- [ ] Item 2

## Files created / modified
[List key files]

## State after prompt
[What's ready for the next prompt]
```

- If a prompt is purely Plan mode (no commit, like Prompt 0), omit the Commit line and note "Plan mode — no commit".
- Commit the audit file in the same branch as the prompt's work, before merging to master.

### Key architectural rules (non-negotiable)
1. Only the MotionController writes to joint state — no exceptions.
2. All control adapters emit `MotionCommand` — nothing else.
3. The IK solver is framework-agnostic (zero React/Three.js imports).
4. Phase 3B (agentic bonus) never replaces Phase 3 (deterministic voice).
5. Build order follows rubric weight, not phase number: PIN entry (20%) before voice (15%).
