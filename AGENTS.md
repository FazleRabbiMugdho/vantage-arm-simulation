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

### Key architectural rules (non-negotiable)
1. Only the MotionController writes to joint state — no exceptions.
2. All control adapters emit `MotionCommand` — nothing else.
3. The IK solver is framework-agnostic (zero React/Three.js imports).
4. Phase 3B (agentic bonus) never replaces Phase 3 (deterministic voice).
5. Build order follows rubric weight, not phase number: PIN entry (20%) before voice (15%).
