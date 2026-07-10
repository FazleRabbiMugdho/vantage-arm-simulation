# Audit: Architecture Plan (Prompt 1)

**Mode:** Plan (no commit)
**Date:** 2026-07-10

## What was done
Proposed complete file/folder structure for a Next.js App Router project covering all 9 requested items:

| # | Item | Path |
|---|---|---|
| 1 | URDF/Three.js viewer | `components/viewer/RobotViewer.tsx` |
| 2 | Shared joint-state store | `lib/store/jointState.ts` (Zustand) |
| 3 | IK solver (framework-agnostic) | `lib/ik/solver.ts` + `forwardKinematics.ts` + `chain.ts` |
| 4 | MotionController module | `lib/motion/MotionController.ts` |
| 5 | MotionCommand types | `lib/motion/types.ts` |
| 6 | Control adapters | `components/controls/*.tsx` + `lib/voice/parser.ts` + `app/api/agentic/route.ts` |
| 7 | Key panel config loader | `lib/config/keyConfig.ts` (zod-validated) |
| 8 | Dashboard layout / activity log | `components/layout/DashboardLayout.tsx` + `components/dashboard/*.tsx` |
| 9 | Tests | `tests/ik/solver.test.ts` (Vitest) |

## Key architectural decisions
- **Zustand** for state (imperative `getState()` for Three.js loop, hooks for React)
- **URDF fetched at runtime** from `/public/`, not imported at build time
- **key_config.json imported** directly via Next.js JSON import
- **EE position computed** inside MotionController during IK, stored alongside jointAngles
- **Linear tween animation** (150-300ms) — no animation library
- **Sidebar layout** for controls, 3D viewer as dominant central area

## Decisions confirmed by team
All 6 flagged ambiguities were accepted without changes.

## Issues flagged
None.

## State after prompt
Approved architecture roadmap — ready to scaffold.
