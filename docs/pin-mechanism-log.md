# PIN Entry Mechanism — Working Mechanism

## Overview

The PIN entry feature simulates a robotic arm pressing a sequence of keys (1–6) on a virtual key panel. The user enters a 6-digit PIN via an input field, and the arm autonomously moves to each key's XYZ position using inverse kinematics (IK). This is a fully autonomous sequence — no manual joystick or keyboard input during execution.

## High-level data flow

```
User types PIN "555555"
       │
       ▼
PinEntryControl (react state: '555555')
       │
       ▼
runSequence() — for each digit:
  ┌────────────────────────────────────────────┐
  │  1. APPROACH: move to (key.x, key.y, key.z + 0.04) │
  │  2. DESCEND:  move to (key.x, key.y, key.z)        │
  │  3. RETRACT:  move to (key.x, key.y, key.z + 0.04) │
  └──────────────┬─────────────────────────────┘
                 │
                 ▼
         MotionController.execute({ type: 'moveTo', target }, 'autonomous')
                 │
                 ▼
          IK solver (solveIK) → animator → joint store → 3D viewer
                  │
                  ▼
          useJointStore.addLogEntry()  →  activityLog[]
                  │
                  ▼
          ActivityLogPanel (shared UI in telemetry sidebar)
          ActiveSourceBadge (header shows "PIN Entry" in amber)
```

---

## Layer 1 — Key Configuration

**File:** `lib/config/keyConfig.ts` + `public/key_config.json`

The key panel has 6 keys arranged in a 2×3 grid:

```json
{
  "frame": "base_link",
  "units": "meters",
  "approach_axis": "-z",
  "keys": {
    "1": { "x": 0.500, "y":  0.050, "z": 0.050 },
    "2": { "x": 0.550, "y":  0.050, "z": 0.050 },
    "3": { "x": 0.600, "y":  0.050, "z": 0.050 },
    "4": { "x": 0.500, "y": -0.050, "z": 0.050 },
    "5": { "x": 0.550, "y": -0.050, "z": 0.050 },
    "6": { "x": 0.600, "y": -0.050, "z": 0.050 }
  }
}
```

The JSON is validated at import time with **Zod** schema validation (`KeyConfigSchema`). It checks that:
- All 6 keys (1–6) exist
- Each key has valid `x`, `y`, `z` coordinates

**Exported constants:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `KEY_POSITIONS` | `[{x, y, z}, ...]` (ordered 1–6) | Zero-indexed array for direct lookup |
| `APPROACH_OFFSET` | `0.04` meters (40 mm) | Distance above key surface for approach/retract |

### Key layout (top-down, looking at panel)

```
         X=0.500    X=0.550    X=0.600
Y=+0.050   [1]        [2]        [3]
Y=-0.050   [4]        [5]        [6]
```

All keys lie on the Z=0.050 plane. The arm approaches from above (negative Z direction).

---

## Layer 2 — PinEntryControl Component

**File:** `components/controls/PinEntryControl.tsx`

### State

```typescript
const [pin, setPin] = useState('555555');   // 6-digit string, digits 1-6 only
const [running, setRunning] = useState(false); // Is sequence executing?
const [currentStep, setCurrentStep] = useState<{digit: number, phase: Phase}>(); // Live status
const [log, setLog] = useState<StepRecord[]>(); // History of all steps
const [rejectionReason, setRejectionReason] = useState<string | null>(null);
```

### Input validation

- Input accepts only digits **1–6**
- Max length: **6 characters**
- Empty or non-6-digit PIN shows error
- "Run Sequence" button is disabled while running

### Sequence execution (`runSequence`)

The sequence is an **async function** that iterates over each digit:

```
For each digit d in pin:
  1. keyIdx = d - 1                    // Convert 1-based to 0-based
  2. key = KEY_POSITIONS[keyIdx]       // Look up XYZ

  3. APPROACH phase:
     target = [key.x, key.y, key.z + APPROACH_OFFSET]  // 40mm above key
     result = motionController.execute({ type: 'moveTo', target }, 'autonomous')
     if rejected: break
     await motionController.waitUntilIdle()

  4. DESCEND phase:
     target = [key.x, key.y, key.z]                     // On key surface
     result = motionController.execute({ type: 'moveTo', target }, 'autonomous')
     if rejected: break
     await motionController.waitUntilIdle()

  5. RETRACT phase:
     target = [key.x, key.y, key.z + APPROACH_OFFSET]  // Back above key
     result = motionController.execute({ type: 'moveTo', target }, 'autonomous')
     if rejected: break
     await motionController.waitUntilIdle()
```

**Wait mechanism:** `motionController.waitUntilIdle()` returns a Promise that resolves when the animation loop finishes, ensuring sequential execution.

**Abort:** `abortRef.current` is checked between phases. Clicking "Stop" sets `abortRef.current = true` and calls `motionController.stopAnimation()`.

### Step logging

Each phase (approach/descend/retract) records a `StepRecord`:
```typescript
interface StepRecord {
  digitIndex: number;  // 1-6 which digit
  phase: Phase;        // 'approach' | 'descend' | 'retract'
  status: StepStatus;  // 'accepted' | 'rejected'
  reason?: string;     // Error message if rejected
}
```

The log is displayed in a scrollable table showing:
```
 # │ Phase      │ Status
───┼────────────┼───────
 1 │ Approach   │ ✓
 1 │ Descend    │ ✓
 1 │ Retract    │ ✓
 2 │ Approach   │ ✓
...
```

### Visual feedback during execution

- **Live step indicator** — shows current digit number and phase with color coding:
  - Approach: sky blue
  - Descend: amber
  - Retract: green
- **Rejection banner** — red box with failure reason (e.g., "Target position is too far")

---

## Layer 3 — MotionController

**File:** `lib/motion/MotionController.ts`

### Entry point

```typescript
motionController.execute({ type: 'moveTo', target: [x, y, z] }, 'autonomous')
```

### Command routing

The `resolveAndValidate` method routes `'moveTo'` commands to `handleMoveTo`:

```typescript
private handleMoveTo(cmd, currentAngles): CommandResult {
  // Validate target is valid numbers
  // Call solveAndValidate(target, currentAngles)
}
```

### `solveAndValidate`

1. Calls `solveIK(currentAngles, target, KINEMATIC_CHAIN, options)` with:
   - `tolerance: 0.002` (2 mm positional accuracy)
   - `maxIterations: 100`
   - `lambda: 0.1` (damping factor)
2. Checks convergence — if not converged, returns `{ accepted: false, reason: "Target position is too far" }`
3. Validates all resulting joint angles are within limits
4. Returns `{ accepted: true, newAngles: number[] }`

### Animation

If accepted, `animateTo(newAngles)`:
1. Captures current joint angles as animation start state
2. Calls `AnimationController.start(current, target, onFrame, onComplete, 200ms)`
3. Each animation frame (`requestAnimationFrame`): ease-in-out interpolation, calls `useJointStore.getState().setJointAngles(angles)`
4. On complete: resolves `waitUntilIdle()` promise

---

## Layer 4 — Inverse Kinematics Solver

**File:** `lib/ik/solver.ts`

Uses **damped least squares** (Levenberg-Marquardt) IK:

```
For each iteration:
  computeTipPosition(angles) → current position
  error = target - current position
  if |error| < tolerance → converged
  
  computeJacobian(angles)  // Finite differences (3×7 matrix)
  J^T * (J * J^T + λ² * I)⁻¹ * error  → joint angle delta
  angles += delta
  clamp to joint limits
```

### Forward Kinematics

**File:** `lib/ik/forwardKinematics.ts`

Computes the end-effector position from 7 joint angles using 4×4 matrix multiplication:

```
For each joint:
  translate to joint origin
  rotate about joint axis
After all joints:
  apply tip offset [0, 0, 0.137] (stylus tip)
```

### Kinematic Chain

**File:** `lib/ik/chain.ts`

7 joints defined with their axes and origins:

| Joint | Axis | Origin (m) | Limits |
|-------|------|-----------|--------|
| joint_1 (base) | Z | (0, 0, 0.060) | ±180° |
| joint_2 | Y | (0, 0, 0.250) | ±120° |
| joint_3 | Y | (0, 0, 0.250) | ±150° |
| joint_4 | Z | (0, 0, 0.250) | ±180° |
| joint_5 | Y | (0, 0, 0.150) | ±120° |
| joint_6 | Z | (0, 0, 0.250) | ±180° |
| stylus_pitch | Y | (0, 0, 0.150) | ±120° |

Tip offset: `[0, 0, 0.137]` meters (extends past last joint to stylus tip)

---

## Layer 5 — Joint State Store

**File:** `lib/store/jointState.ts`

Uses **Zustand** for global state:

```typescript
interface JointState {
  jointAngles: number[];       // 7-element array (radians)
  eePosition: [number, number, number];  // XYZ in meters
  activityLog: LogEntry[];     // History of all commands
  // setters...
}
```

The store is updated:
- **By MotionController** → `setJointAngles(angles)` each animation frame
- **By RobotViewer** → `setEePosition(pos)` reads Three.js scene each frame
- **By MotionController** → `addLogEntry(entry)` on every command execution

---

## Unified Dashboard (Prompt 12 Integration)

All control adapters (joystick, keyboard, voice, autonomous/PIN) are integrated into a single page layout with a shared activity log.

### Layout

```
┌───────────────────────┬──────────────────┬──────────────────────┐
│ Vantage Sim  [Badge]  │                  │                      │
├───────────────────────┤ Controls ▲       │ Telemetry ▲          │
│                       ├──────────────────┼──────────────────────┤
│     3D Viewer         │ PIN Entry        │ Telemetry Panel      │
│                       │ Voice Control    │----------------------│
│                       │ Keyboard         │ JoystickControl      │
│                       │                  │----------------------│
│                       │                  │ Activity Log [Clear] │
└───────────────────────┴──────────────────┴──────────────────────┘
```

### Shared Activity Log

**File:** `components/dashboard/ActivityLogPanel.tsx`

- Reads directly from `useJointStore.activityLog` — the **single** log array populated only by `MotionController.execute()`
- Each PIN entry step (approach/descend/retract) generates a `LogEntry` with `source: 'autonomous'`
- Displays: timestamp, color-coded source label, command summary, ✓/✗ status, rejection reason
- "Clear" button empties the log

### Active Source Badge

**File:** `components/dashboard/ActiveSourceBadge.tsx`

- Located in the top-right of the page header
- Reads the last entry from `activityLog` and shows its source
- Color-coded per source:
  - **Joystick** → blue
  - **Keyboard** → purple
  - **Voice** → green
  - **PIN Entry (autonomous)** → amber
  - **Agentic** → red
- Shows "No activity" when the log is empty

### Single Push Point

Verified: `addLogEntry` is called **only** from `MotionController.ts:25`. No control adapter pushes directly to the log. This is the architectural proof that all five inputs funnel through one pipeline.

---

## Sequence diagram (one digit)

```
User          PinEntryControl        MotionController      IK Solver     Joint Store
 │                    │                      │                  │             │
 │ click Run         │                      │                  │             │
 │──────────────────►│                      │                  │             │
 │                   │ runSequence()        │                  │             │
 │                   │ for digit 5:         │                  │             │
 │                   │                      │                  │             │
 │                   │ APPROACH:            │                  │             │
 │                   │ target=(0.55,0.05,   │                  │             │
 │                   │         0.09)        │                  │             │
 │                   │─────────────────────►│                  │             │
 │                   │  execute(moveTo)     │                  │             │
 │                   │                      │────► solveIK() ──►             │
 │                   │                      │                  │             │
 │                   │                      │◄── angles ──────│             │
 │                   │                      │                  │             │
 │                   │                      │ animateTo()     │             │
 │                   │                      │───────── frames ──────────────►│
 │                   │                      │   setJointAngles               │
 │                   │                      │                  │             │
 │                   │◄── {accepted: true} ─│                  │             │
 │                   │                      │                  │             │
 │                   │ await idle           │                  │             │
 │                   │──── waitUntilIdle() ─►  promise resolves             │
 │                   │                      │                  │             │
 │                   │ DESCEND:             │                  │             │
 │                   │ target=(0.55,0.05,   │                  │             │
 │                   │         0.05)        │                  │             │
 │                   │─────────────────────►│                  │             │
 │                   │  ... same flow ...   │                  │             │
 │                   │                      │                  │             │
 │                   │ RETRACT: back to     │                  │             │
 │                   │  approach position   │                  │             │
 │                   │                      │                  │             │
 │                   │ digit complete,      │                  │             │
 │                   │ move to next digit   │                  │             │
```

---

## Error handling

| Failure | Where detected | User sees |
|---------|---------------|-----------|
| Invalid PIN (not 6 digits) | `runSequence()` | Red error text below input |
| IK doesn't converge | `solveAndValidate` | "Target position is too far" in red banner |
| Joint exceeds limit | Limit check in `solveAndValidate` | "[joint_name] would exceed its safe limit" |
| User clicks Stop | `abortRef.current` check | Sequence stops immediately |

---

## File inventory

| File | Role |
|------|------|
| `components/controls/PinEntryControl.tsx` | PIN input UI + sequence orchestrator |
| `lib/config/keyConfig.ts` | Key panel config loader (Zod-validated) |
| `public/key_config.json` | Raw XYZ positions for all 6 keys |
| `lib/motion/MotionController.ts` | Command validation, IK dispatch, animation |
| `lib/motion/animation.ts` | Ease-in-out joint interpolation (200ms) |
| `lib/motion/types.ts` | `MotionCommand`, `AdapterName`, `CommandResult` |
| `lib/ik/solver.ts` | Damped least-squares IK solver |
| `lib/ik/forwardKinematics.ts` | 4×4 matrix forward kinematics |
| `lib/ik/chain.ts` | 7-joint kinematic chain definition |
| `lib/ik/matrix.ts` | 4×4 matrix math utilities |
| `lib/store/jointState.ts` | Zustand store for joint angles + activity log |
| `lib/config/jointLimits.ts` | Per-joint angle bounds with degree conversions |
| `app/page.tsx` | Mounts PinEntryControl in controls panel, ActivityLogPanel + ActiveSourceBadge |
| `components/dashboard/ActivityLogPanel.tsx` | Shared activity log panel |
| `components/dashboard/ActiveSourceBadge.tsx` | Active source indicator in header |
| `components/dashboard/TelemetryPanel.tsx` | Displays joint angles + end-effector XYZ |
| `components/viewer/RobotViewer.tsx` | Three.js renderer, updates eePosition each frame |
