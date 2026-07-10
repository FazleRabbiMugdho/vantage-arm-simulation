# Vantage Robotics Simulation Suite — Project Overview
**Team manties | Techathon Nationals & Rover Summit 2026 | Rounds: R1 20% — R2 20% — R3 60%**

> Note: the source PDF is titled "Dry Run" internally but filed as "Final Round" — confirm with organizers whether this is a practice run or the actual final, since it affects how much polish R3 needs.

---

## 1. The problem, stripped to its core

Vantage Robotics wants all control software for a 6-DOF industrial arm proven in a browser simulation before it ever touches real hardware. You're given a URDF (arm geometry) and `key.config.json` (fixed 3D coordinates of a 6-key test panel). Everything else — visualization, manual control, voice control, autonomous PIN entry, and an optional agentic layer — is what you build.

**The one-sentence reframe that should drive every design decision:**
This is **one motion-control pipeline**, triggered by **five different front-ends** (dashboard, joystick, keyboard, voice, autonomous sequence). Every adapter must funnel into the same validated controller. The rubric explicitly penalizes an agentic layer that can send unchecked commands — architecture discipline is graded, not just features.

## 2. What's provided vs. what we build

| Provided | We build |
|---|---|
| URDF of the 6-DOF arm (no gripper, fixed stylus tip) | Web-based 3D dashboard (visualize + move) |
| `key.config.json` — fixed 3D coords of the 6-key panel | Visual representation of the panel + IK solver |
| Problem statement + judging rubric | Joystick GUI control + keyboard control |
| — | Voice control |
| — | Autonomous PIN-entry mode |
| — | Arm's electrical schematic |
| — | (Optional, bonus) Agentic natural-language voice layer |

## 3. Provided assets — technical analysis (now that we have the real files)

### 3.1 Important finding: this is actually a 7-joint chain, not 6
The problem statement calls it a "6-DOF industrial arm," but the URDF (`stylus_arm`) defines **7 actuated revolute joints**: `joint_1` through `joint_6` plus `stylus_pitch`. Worth raising with organizers/mentors as a clarifying question, but here's a concrete plan either way — assumption stated so the team can proceed without waiting on an answer:

- **Option A (recommended default): treat `stylus_pitch` as a redundant 7th DOF and let the IK solver use it naturally.** A damped-least-squares Jacobian solver handles redundancy gracefully — it just resolves to a minimum-norm joint change. No extra work required, and it's arguably *more* correct given the real URDF.
- **Option B: lock `stylus_pitch` at a fixed angle (e.g. 0) and solve IK over the remaining 6 joints**, if the team wants to match the problem statement's "6-DOF" framing literally for the explanation slide.
- Either is defensible — pick one, state the assumption explicitly in your architecture explanation (this is exactly the kind of trade-off the rubric's "Concept Explanation" criterion rewards making explicit rather than silently picking one).

### 3.2 Joint table (from the URDF, all limits in radians)
| Joint | Axis | Type | Limit (rad) | Limit (deg) | Effort | Velocity | Link length to next joint |
|---|---|---|---|---|---|---|---|
| `joint_1` (base yaw) | Z | revolute | ±3.1416 | ±180° | 60.0 | 2.5 | 0.250 m |
| `joint_2` (shoulder pitch) | Y | revolute | ±2.0944 | ±120° | 60.0 | 2.5 | 0.250 m |
| `joint_3` (elbow pitch) | Y | revolute | ±2.6180 | ±150° | 40.0 | 3.0 | 0.250 m |
| `joint_4` (forearm roll) | Z | revolute | ±3.1416 | ±180° | 25.0 | 3.5 | 0.150 m |
| `joint_5` (wrist pitch) | Y | revolute | ±2.0944 | ±120° | 15.0 | 4.0 | 0.250 m |
| `joint_6` (tool roll) | Z | revolute | ±3.1416 | ±180° | 10.0 | 4.5 | 0.150 m |
| `stylus_pitch` (7th, redundant) | Y | revolute | ±2.0944 | ±120° | 8.0 | 5.0 | 0.137 m to tip (fixed) |

Base offset (`base_link` origin to `joint_1`): 0.060 m along Z.

**These are the exact numbers to hardcode into the MotionController's joint-limit validation step** (Section 7) — pull them from the URDF at load time via `urdf-loader` rather than re-typing them, so the validator never drifts out of sync with the actual model.

### 3.3 Reach sanity check
Summing link lengths along a fully-extended chain (worst-case, not a real IK path): 0.060 + 0.250×3 + 0.150×2 + 0.137 ≈ **1.497 m** maximum theoretical reach. The key panel sits at radius ≈0.5–0.6 m in the XY plane and z = 0.05 m — well within reach, but notably **low and close-in relative to the base** (z = 0.05 m is barely above the base's own mounting height of 0.06 m). Expect the elbow (`joint_3`) to bend significantly to bring the tip down to that height — worth a quick manual IK sanity check early rather than assuming it "just works," since a target this close to the base can occasionally sit near a singularity for some arm configurations.

### 3.4 The actual end-effector frame
The stylus is **not** the last actuated link — there's a fixed child joint `stylus_tip_frame` (0.137 m further along Z from the `stylus` link) whose child link `stylus_tip` is the true TCP (tool center point). **The IK solver must target `stylus_tip`, not `stylus`** — an easy, easy-to-miss bug since `stylus` looks like the natural "last link" to grab from the URDF tree.

### 3.5 Key panel layout (from `key.config.json`)
- Frame: `base_link` (same root frame as the URDF — no extra transform needed).
- Units: meters. Approach axis: **-Z** — meaning the correct motion to "press" a key is to arrive above it and move in the -Z direction to touch, then retract back in +Z. This directly defines the `pressKey` motion primitive.

| Key | x | y | z |
|---|---|---|---|
| 1 | 0.500 | 0.050 | 0.050 |
| 2 | 0.550 | 0.050 | 0.050 |
| 3 | 0.600 | 0.050 | 0.050 |
| 4 | 0.500 | -0.050 | 0.050 |
| 5 | 0.550 | -0.050 | 0.050 |
| 6 | 0.600 | -0.050 | 0.050 |

Layout is a flat 3×2 grid (keys 1-2-3 on the +Y row, 4-5-6 on the -Y row), 50 mm spacing in X, 100 mm row spacing in Y, all at the same height. **Recommended `pressKey` motion primitive:** move to `(x, y, z + 0.04)` (approach point, 40 mm above the key) → descend to `(x, y, z)` (the actual touch point, within the ±5 mm tolerance the rubric allows) → retract back to the approach point before moving to the next key. This gives PIN entry a clean, visually legible "peck" motion for the demo rather than the stylus dragging across the panel.

### 3.6 Orientation note (approach axis vs. the redundant 7th joint)
Because the task only truly constrains position (3 DOF) plus "arrives pointing roughly along -Z" (2 more DOF; roll about the approach axis is unconstrained), the arm has 2 spare DOF relative to a 7-joint chain, or exactly 0 spare relative to a 6-joint reading (see 3.1). Simplest defensible engineering approach: **solve position-only IK** with the Jacobian (3 target rows), and treat the -Z approach as satisfied by construction — since the panel sits low and in front of the base, a natural elbow-down configuration reaching toward it will already point the stylus roughly downward. Verify this visually once the solver is running; only add explicit orientation rows to the Jacobian if the natural solution doesn't approach cleanly.
## 4. Evaluation rubric (core = 100%, bonus on top)

| Criterion | Weight |
|---|---|
| Visualization & Dashboard | 15% |
| Inverse Kinematics | 15% |
| Manual Control (joystick + keyboard) | 10% |
| Voice Control | 15% |
| Autonomous PIN Entry | 20% |
| Electrical Schematic | 5% |
| System Architecture & Concept Explanation | 15% |
| Overall Polish & Presentation | 5% |
| **Agentic Bonus (Phase 3B)** | **+10% (bonus, not required)** |

**Reading the rubric strategically:** Autonomous PIN Entry (20%) is the single biggest line item — higher priority than Voice Control if time runs short. Architecture & Concept Explanation (15%) is scored on how well you *explain* the system, not just whether it runs — prepare this continuously, not the night before. The Agentic Bonus sits on top of 100%, so never trade core-rubric time for it.

---

## 5. Recommended tech stack

Following the deployment discipline from our earlier prep: **one deployable app, one `.env.local`.**

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind | One app, API routes double as backend if needed, one Vercel deploy |
| 3D rendering | Three.js + `urdf-loader` (gkjohnson) | Purpose-built for parsing/rendering URDF with live joint control |
| IK | Hand-rolled numerical solver (Jacobian transpose or damped least squares), client-side | Generic over any URDF joint chain, fast enough for real-time jogging, and — critically — **you can explain it to judges**, which a black-box library can't offer for the 15% architecture score |
| Manual control | On-screen joystick + keyboard (arrow keys/WASD + modifiers) | Both required, both must map to the same `MotionCommand` |
| Voice (required) | Web Speech API (`SpeechRecognition`), browser-native | Free, no backend, no API cost, works for fixed keyword commands |
| Autonomous PIN entry | Sequencer reading `key.config.json` → per-digit approach/descend/retract motion | Feeds the same controller as everything else |
| Agentic bonus (optional) | Next.js API route → Gemini Flash (free tier) with structured/function-calling output, Groq as fast fallback | Only after core rubric is solid |
| Deployment | Vercel (frontend + API routes) | Free, one deploy, matches the kit's Option A default |

## 6. The shared command schema (design this before writing any feature code)

Every control surface — joystick, keyboard, voice parser, PIN sequencer, agentic layer — emits only this:

```ts
type MotionCommand =
  | { type: "jog"; deltaX: number; deltaY: number; deltaZ: number }
  | { type: "moveTo"; target: [number, number, number] }
  | { type: "rotateJoint"; joint: number; degrees: number }
  | { type: "pressKey"; keyIndex: number }; // 0–5, resolved via key.config.json
```

`moveTo` targets are always positions of the `stylus_tip` frame (see Section 3.4), never `stylus` or any earlier link — every adapter and the IK solver should agree on this from day one to avoid a class of bugs where things are "close but off by 137mm."

Nothing outside the controller touches IK math or joint state directly. This is the single design choice that makes the "one pipeline, five triggers" framing real instead of just a slide.

## 7. MotionController — the safety gate (also your architecture-slide centerpiece)

Pipeline for every incoming `MotionCommand`:
1. Receive the command.
2. Resolve it to a target end-effector pose.
3. Run IK → candidate joint angles.
4. **Validate**: joint limits (from URDF), workspace reachability, no NaN/out-of-range values.
5. **Valid** → animate smoothly, update dashboard state.
   **Invalid** → reject with a structured reason string (this reason is exactly what Phase 3B's spoken feedback should read back to the operator — "couldn't reach that position because it's outside the joint 3 limit," not a generic error).

This single choke point directly satisfies the rubric's explicit warning: an agentic layer that can send arbitrary/unchecked motion commands is marked down under Architecture & Safety regardless of capability.

## 8. Build order — sequenced by rubric weight, not by phase number

1. **URDF load + render** (Phase 1, 15%) — fast, visible win, unblocks everything downstream.
2. **IK solver + MotionController + joystick/keyboard** (Phase 2, 15% + 10%) — the real foundation.
3. **Autonomous PIN entry** (Phase 4, 20%, the single highest-weighted item) — prioritize this over voice if time is tight.
4. **Voice control** (Phase 3, 15%) — fast once the controller exists; it's just another adapter emitting the same schema.
5. **Electrical schematic** (Phase 5, 5%) — good parallel task for a teammate not deep in the 3D/IK code.
6. **Architecture diagram + explanation** — prepare continuously alongside the above, not as a last-hour scramble.
7. **Phase 3B agentic bonus** — only attempt after 1–6 are solid; it's bonus on top of 100%, never a trade against core points.

## 9. Electrical schematic — pin-mapping reference
(Build the actual Wokwi diagram yourselves — this is a reference table, not a ready-made schematic file.)

| From | To | Notes |
|---|---|---|
| ESP32 (Wi-Fi capable) | PCA9685 servo driver, I2C | SDA→SDA, SCL→SCL, shared GND |
| External 5–6V supply | PCA9685 V+ rail | Servos need dedicated power — 6 servos can brown out an ESP32's onboard regulator |
| PCA9685 channels 0–5 | 6 servo signal pins | One channel per joint |
| Servo V+/GND | External rail / common GND | Common ground across ESP32, PCA9685, and servos is essential |
| 470–1000 µF capacitor | Across servo power rail near PCA9685 | Smooths current spikes when multiple servos move simultaneously |

## 10. Deliverables checklist
- [ ] Working web app demonstrating Phases 1–5
- [ ] Source repo, including architecture diagrams and the electrical schematic
- [ ] Deployed URL (bonus)
- [ ] Short live demo video (bonus) — narrated as if presenting to Vantage's engineering team: visualize → manual (joystick, keyboard) → voice → autonomous PIN entry, framed as "this pipeline is ready to trust with real hardware"

## 11. Open questions to resolve as a team before/at kickoff
- Is "Dry Run" vs. "Final Round" a practice round or the actual final — confirm with organizers.
- **7-DOF vs 6-DOF**: decide whether to let `stylus_pitch` float as a redundant joint or lock it — see Section 3.1. Recommend deciding this in the first 30 minutes since it shapes the IK solver's dimensions.
- Team comfort level writing a Jacobian/DLS IK solver from scratch vs. wanting a reference starting point — changes the Phase 2 time estimate.
- Commit level for the Phase 3B agentic bonus: attempt only if time remains after the core rubric is solid, given it's worth +10% on top of 100% but core items total the other 90%+ of your actual grade.

## 12. Working-process reminder (from the organizer-provided guidance in the problem PDF)
- Before implementing any major component: state assumptions, a short implementation plan, trade-offs, and a validation approach.
- If a requirement is ambiguous, ask a clarifying question rather than assuming.
- For hardware/wiring: pin-mapping tables and electrical reasoning — not a ready-made Wokwi/Tinkercad project export.
- Prefer modular architecture, shared backend/controller design, and documentation over one-shot solutions.
