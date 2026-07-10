# Joystick Control Issue — Complete Diagnosis & Fix

## Problem summary

The on-screen joystick does not produce smooth, controlled motion:
1. XY drag produces little to no visible movement
2. Z +/- buttons produce movement (but may behave unexpectedly)
3. Arm motion is jittery when it does occur

---

## 1. ROOT CAUSE: Singular starting pose — verified by IK solver tests

We ran the actual IK solver against small jog offsets from the zero pose. **The results are definitive:**

### At the zero-all-angles pose (arm straight up, tip at [0, 0, 1.497]):

| Jog | Result | Iterations | Tip after | Why |
|-----|--------|-----------|-----------|-----|
| X+1mm | ✅ converges | 1 | [0, 0, 1.497] | **Deadzone**: 1mm < 2mm tolerance → solver returns immediately, no angles change |
| X+3mm | ✅ converges | 2 | [0.003, 0, 1.497] | Works — joint_2/3 tilt the arm in X |
| X+10mm | ✅ converges | 2 | [0.010, 0, 1.497] | Works fine |
| X+50mm | ✅ converges | 2 | [0.050, 0, 1.496] | Works fine |
| **Y+10mm** | **❌ FAILS** | **100** | **[0, 0, 1.497]** | **No Y response at all** |
| **Z+10mm** | **❌ FAILS** | **100** | **[0, 0, 1.497]** | **No Z response at all** |
| Z-10mm | ✅ converges | 62 | [0, 0, 1.488] | Works — arm bends down, but slow |
| Z-50mm | ✅ converges | 21 | [0, 0, 1.447] | Works — faster for larger movement |

### After tilting the arm (repeated X jogs to x=0.050):

| Jog | Result | Iterations | Tip after |
|-----|--------|-----------|-----------|
| Y+5mm | ✅ converges | 7 | [0.050, 0.003, 1.495] |
| Z-5mm | ✅ converges | 15 | [0.050, 0.000, 1.493] |
| Z+5mm | ❌ FAILS | 100 | [0.050, 0, 1.496] — still at max reach |

### Why this happens — Jacobian analysis at the zero pose

At the zero pose, every joint's position vector lies along the Z axis. The Jacobian column for each joint is:

```
dP/dθ_i = axis_i × (P_tip - P_joint_i)
```

| Joint | Axis | Position vector | Jacobian column | What it moves |
|-------|------|----------------|-----------------|---------------|
| joint_1 | Z | [0, 0, 1.437] | **[0, 0, 0]** | **NOTHING** — tip is ON the Z axis |
| joint_2 | Y | [0, 0, 1.187] | **[1.187, 0, 0]** | **X only** |
| joint_3 | Y | [0, 0, 0.937] | **[0.937, 0, 0]** | **X only** |
| joint_4 | Z | [0, 0, 0.687] | **[0, 0, 0]** | **NOTHING** |
| joint_5 | Y | [0, 0, 0.687] | **[0.687, 0, 0]** | **X only** |
| joint_6 | Z | [0, 0, 0.437] | **[0, 0, 0]** | **NOTHING** |
| stylus_pitch | Y | [0, 0, 0.137] | **[0.137, 0, 0]** | **X only** |

**The Jacobian has zero columns for Y and Z motion at the zero pose.** The DLS formula `dq = J^T × (J×J^T + λ²I)^(-1) × error` produces zero joint deltas for Y or Z errors because `J^T` has zero rows for Y and Z.

This is a **fundamental kinematic singularity**, not a solver bug. The arm literally cannot produce Y or Z tip motion from the straight-up pose using small-angle linearized Jacobian methods.

Once the arm tilts in X (e.g., after a few X jogs), the position vectors gain X components, and the Jacobian recovers full rank for Y and Z.

---

## 2. SECONDARY ISSUE: Tolerance deadzone for X motion

**What the test shows:**
- X+1mm: converges on iteration 1 (error check passes immediately), returns initial angles unchanged
- The 2mm tolerance means any jog delta < 2mm produces zero movement
- At SCALE = 0.000667 m/px, this is a 3px deadzone around the pad center

**Impact:** The first 3px of horizontal drag produce no response. Users trying gentle/small movements assume the control doesn't work.

---

## 3. TERTIARY ISSUE: Animation overlap (once movement starts)

When the user drags rapidly, jogs fire every 40ms (25fps) but each animation runs for 200ms:

```
t=0ms:   jog #1 fires → IK solves → animateTo(target1) starts
t=40ms:  animation at 8% progress → jog #2 fires → IK solves from mid-animation angles
         → animateTo(target2) restarts from mid-animation
t=80ms:  animation at 8% progress (again) → jog #3 fires → same pattern
...
```

**Problem:** Each new jog restarts the animation from only ~8% progress, so the arm never reaches even the first target. The arm oscillates near the starting position.

This is less critical than the singularity issue but explains the jitter when movement does occur.

---

## 4. FIX RECOMMENDATIONS (ordered by impact)

### Fix 1 (CRITICAL): Change the default pose

**Root cause of all Y/Z issues.** Start the arm in a bent, well-conditioned pose instead of all zeros.

**Suggested home pose:**
```ts
// Arm pointing toward the key panel area (X≈0.55, Y=0, Z≈0.05)
// Joint angles that put the tip at ~(0.3, 0, 0.5):
const HOME_POSE = [0, 0.5, -0.3, 0, 0.3, 0, 0];
```

This gives the Jacobian full rank for all 3 axes immediately. Test this new pose with the jog test suite before deploying.

### Fix 2 (HIGH): Eliminate tolerance deadzone for jog

**Two options:**

**Option A:** Reduce tolerance to 0.5mm for jog commands
```ts
// In handleJog, use tighter tolerance
const result = solveIK(currentAngles, target, KINEMATIC_CHAIN, {
    tolerance: 0.0005,  // 0.5mm instead of 2mm
    maxIterations: 100,
    lambda: 0.1,
});
```

**Option B:** Require minimum iterations (skip early convergence check for small errors)
```ts
// Pass a flag or use different options for jog
const result = solveIK(currentAngles, target, KINEMATIC_CHAIN, {
    tolerance: 0.002,
    maxIterations: 100,
    lambda: 0.1,
    minIterations: 3,  // NEW option — always run at least 3 iterations
});
```

### Fix 3 (HIGH): Use a non-zero default home pose in RobotViewer

In `components/viewer/RobotViewer.tsx`, change the initial joint values from all zeros to a bent pose:

```ts
// Instead of:
robot.setJointValues({
    joint_1: 0, joint_2: 0, joint_3: 0, joint_4: 0,
    joint_5: 0, joint_6: 0, stylus_pitch: 0,
});

// Use:
robot.setJointValues({
    joint_1: 0, joint_2: 0.5, joint_3: -0.3, joint_4: 0,
    joint_5: 0.3, joint_6: 0, stylus_pitch: 0,
});
```

AND update the Zustand store's initial `jointAngles` to match.

### Fix 4 (MEDIUM): Map joystick Y to direct joint_1 rotation

Since the IK solver can't move the arm in Y from the zero pose, handle Y motion specially:

```ts
// In handleJog, if deltaY != 0 and at/near zero pose:
if (Math.abs(cmd.deltaY) > 0.001 && isNearZeroPose(currentAngles)) {
    // Rotate joint_1 (base yaw) directly. A small rotation of joint_1
    // doesn't move the tip (it's on Z axis), but it changes joint_4 and joint_6
    // which can then produce Y motion in subsequent FK solves.
    // Better: just do a moveTo with the Y offset, and let IK handle it.
}
```

Actually, this approach is complex and fragile. Better to just Fix 1 (change the default pose).

### Fix 5 (LOW): Accumulate jog deltas instead of incremental target

Instead of computing target = currentPos + delta each time, accumulate a world-space offset:

```ts
// In MotionController:
private jogAccumulator: [number, number, number] = [0, 0, 0];

handleJog(cmd, currentAngles) {
    this.jogAccumulator[0] += cmd.deltaX;
    this.jogAccumulator[1] += cmd.deltaY;
    this.jogAccumulator[2] += cmd.deltaZ;

    const initialPose = computeTipPosition(HOME_POSE, KINEMATIC_CHAIN);
    const target = [
        initialPose[0] + this.jogAccumulator[0],
        initialPose[1] + this.jogAccumulator[1],
        initialPose[2] + this.jogAccumulator[2],
    ];
    return this.solveAndValidate(target, currentAngles);
}
```

This ensures each jog targets the same absolute position regardless of current animation state, eliminating drift.

### Fix 6 (LOW): Queue jogs instead of canceling animation

Don't interrupt the running animation. Queue incoming jog commands and process them when the current animation completes. This adds 200ms latency but ensures each IK solve starts from settled angles.

---

## 5. REPRODUCTION — verified test output

```
=== Small jogs from zero pose (what joystick does) ===
X+1mm : OK dist=1.00mm iters=1 tip=[0.000,0.000,1.497]   ← DEADZONE
X+3mm : OK dist=0.01mm iters=2 tip=[0.003,0.000,1.497]   ← WORKS
X+10mm: OK dist=0.05mm iters=2 tip=[0.010,0.000,1.497]   ← WORKS
X+50mm: OK dist=1.01mm iters=2 tip=[0.050,0.000,1.496]   ← WORKS
Y+10mm: FAIL dist=10.00mm iters=100 tip=[0.000,0.000,1.497]  ← SINGULARITY
Z+10mm: FAIL dist=10.00mm iters=100 tip=[-0.000,-0.000,1.497] ← SINGULARITY
Z-10mm: OK dist=1.30mm iters=62 tip=[0.000,0.000,1.488]   ← WORKS (slow)
Z-50mm: OK dist=0.43mm iters=21 tip=[0.000,0.000,1.447]   ← WORKS

=== Repeated X+10mm jog (held joystick) ===
Jog 1: OK tip=[0.010,0.000,1.497] iters=2
Jog 5: OK tip=[0.050,-0.000,1.496] iters=2              ← Incremental X works!

=== After tilt: Y and Z jogs from bent pose ===
Y+5mm: OK dist=1.68mm iters=7 tip=[0.050,0.003,1.495]  ← Y works after tilt!
Z-5mm: OK dist=1.67mm iters=15 tip=[0.050,0.000,1.493] ← Z- works after tilt!
```

---

## 6. Quick fix checklist

- [x] Change default arm pose from all-zero to bent/elbow-down
- [x] Update initial `jointAngles` in Zustand store to match new pose
- [x] Update initial `robot.setJointValues()` in RobotViewer to match
- [x] Rotate the Three.js URDF robot vertically (Y-up in world, Z-up in local base frame)
- [x] Render the Key Panel as a child of the robot to align with base_link coordinates
- [x] Convert stylus tip coordinates to local robot frame in the rendering loop
- [x] Add X, Y, and Z manual jog buttons to the Joystick panel
- [x] Add a Jog Step Size Selector (5mm, 10mm, 25mm, 50mm) to configure intensity
- [x] Verify telemetry panel shows correct initial local EE position
- [x] Verify the arm renders upright at the new default pose

## 7. Final Solution Implemented

1. **Singularity & Orientation Fixes:**
   - Set the initial `HOME_POSE` in `jointState.ts` and `RobotViewer.tsx` to `[0, 0.8, -1.0, 0, 0.8, 0, 0]`.
   - Rotated the URDF robot by `-Math.PI / 2` around the X axis in Three.js (`robot.rotation.x = -Math.PI / 2`) to mount it upright on the grid floor.
   - Mounted the key panel as a child of the `robot` group (`createKeyPanel(robot)`) so the keys automatically inherit the correct rotated coordinate space.
   - Updated the end-effector position tracking to map the world position back to local coordinates (`robot.worldToLocal(localPos)`), decoupling the visual rendering space from the kinematic solver calculations.

2. **Jog Interface Improvements:**
   - Added manual jog button columns for the X, Y, and Z axes (offering + and − controls).
   - Added a **Jog Step Size** selector under the joystick panel (supporting 5mm, 10mm, 25mm, and 50mm increments) defaulting to `25mm` to provide instant, high-intensity visual changes.
   - Boosted drag pad scale sensitivity to `0.0015` for much more active response.

