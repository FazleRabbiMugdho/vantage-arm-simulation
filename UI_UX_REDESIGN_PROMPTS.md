# UI/UX Redesign — Collapsible Feature Cards
**For: Antigravity (Gemini Flash 3.5 Medium) | Based on: `ui-ux.md` (current-state architecture doc)**

## Why this redesign, based on what's actually in `ui-ux.md`
The current layout (Section 1.2) is a fixed 3-column dashboard — Controls sidebar, 3D Viewer, Telemetry sidebar — with all 5 control components (PIN, Voice, Agentic, Keyboard, Joystick) stacked and permanently visible in the left sidebar, separated only by borders. Section 13 of that doc already self-identifies the core problem: **"No visual hierarchy beyond panel headings — all sections equally weighted"** and **"No welcome/initial state — dashboard starts fully populated, can be overwhelming."** That's exactly the confusion you described. Everything below is designed to fix that specific problem without touching any of the underlying logic (MotionController, MotionCommand pipeline, IK solver) — this is a pure information-architecture and layout change.

---

## Proposed information architecture

### What stays permanently visible (not collapsible)
These aren't "features to choose," they're the shared output every feature depends on — hiding them behind a click would mean re-opening them constantly.
- **Header**: title + one-line tagline explaining the whole app in plain language (e.g. "Control the simulated arm using any method below — they all drive the same arm.")
- **3D Viewer**: stays large and central, exactly as now (Section 1.2 confirms this is already the visual anchor — keep it that way).
- **Live Status Strip**: a new, slim, always-visible bar (not a full panel) showing just the current end-effector (x, y, z) and the last command's accept/reject status. This replaces constantly needing the full Telemetry panel open just to see "is it doing something right now."

### What becomes a collapsible feature card
Each of these becomes an independent, clickable card: **click the header to expand/collapse; multiple can be open at once (not an exclusive accordion)** — matching your original idea exactly, since a user might reasonably want Joystick and Telemetry open side by side.

Recommended order (most beginner-friendly / most likely to be tried first → most advanced), with a one-line description shown even when collapsed so users know what's inside before clicking:

| # | Card | One-line description shown when collapsed | Maps to existing component |
|---|---|---|---|
| 1 | 🎯 **Target Position** | "Type exact coordinates and send the arm straight there." | **New — not yet built, see spec below** |
| 2 | 🕹️ **Joystick** | "Drag to move the tip freely in real time." | `JoystickControl.tsx` |
| 3 | ⌨️ **Keyboard** | "Use arrow keys and shortcuts to jog the arm." | `KeyboardControl.tsx` |
| 4 | 🔢 **PIN Sequence** | "Enter a 6-digit code and watch the arm type it automatically." | `PinEntryControl.tsx` |
| 5 | 🎙️ **Voice Control** | "Speak simple commands like 'move up' or 'press key 3'." | `VoiceControl.tsx` |
| 6 | 🤖 **Agentic AI** | "Describe what you want in your own words." | `AgenticControl.tsx` |
| 7 | 📊 **Joint & Position Details** | "Full breakdown of every joint angle and the exact tip position." | `TelemetryPanel.tsx` (detailed view) |
| 8 | 📜 **Activity Log** | "History of every command sent, from any control." | `ActivityLogPanel.tsx` |

### ASCII wireframe of the new layout
```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER — title + one-line tagline                                 │
├──────────────────────────────────────────────────────────────────┤
│ LIVE STATUS STRIP — EE position · last command accepted/rejected  │
├───────────────────────────────┬────────────────────────────────────┤
│                               │  🎯 Target Position         [▾]   │
│                               │  🕹️ Joystick                [▾]   │
│         3D VIEWER             │  ⌨️  Keyboard                [▸]   │
│         (unchanged,           │  🔢 PIN Sequence             [▸]   │
│          still dominant)      │  🎙️ Voice Control            [▸]   │
│                               │  🤖 Agentic AI               [▸]   │
│                               │  📊 Joint & Position Details [▸]   │
│                               │  📜 Activity Log             [▸]   │
└───────────────────────────────┴────────────────────────────────────┘
        [▾] = expanded, showing the real control inline below its header
        [▸] = collapsed, just the header + one-line description
```

---

## My advice, beyond what you asked for

1. **Don't start with everything collapsed.** An entirely collapsed list on first load looks empty and gives no hint of what to do. Default-open **Target Position** and **Joystick** only (the two simplest, most immediately-satisfying manual controls) — everything else starts collapsed. This gives new users an immediate, obvious first action without the overwhelm of all 8 sections expanded.
2. **Show the one-line description even when collapsed**, as in the table above. This is the single biggest confusion-reducer: a user shouldn't have to click into a section just to find out what it does.
3. **Highlight the active card.** Reuse the existing `ActiveSourceBadge` concept (Section 1.2) — when a command comes from, say, Voice Control, give that card's header a subtle highlight/border for a moment. This turns the card list into a live "what's happening" indicator, not just a static menu, and directly helps during your live demo (judges can see at a glance which control is currently driving the arm).
4. **Telemetry and Activity Log are outputs, not controls — order them last**, and keep the Live Status Strip always visible so users aren't blind while those two are collapsed. This matches Section 13's own complaint that everything currently reads as equally important when it isn't.
5. **Add a tiny badge count to Activity Log's collapsed header** (e.g. "📜 Activity Log (12)") so users get a sense something is happening even without opening it.
6. **Fix the accessibility gaps flagged in Section 13.4 while you're already touching every card header** — this redesign touches every collapse control anyway, so it's the cheapest possible time to add `aria-expanded`, `aria-controls`, and visible focus rings. Skipping this now means re-touching all 8 headers again later for the same fix.
7. **Don't build a guided tour/onboarding modal** — that's real scope for one afternoon. The default-open cards + one-line descriptions already solve most of the "new user is confused" problem without extra engineering.

---

## New feature spec: Target Position (not yet in the codebase)

Since this is new, here's a minimal spec so Antigravity has something concrete to build rather than guessing:
- Three number inputs (X, Y, Z, in meters, matching the same coordinate frame as `key_config.json`) + a "Go" button.
- On submit, emits a `moveTo` `MotionCommand` (already defined in `lib/motion/types.ts` per the appendix in `ui-ux.md`) through the existing `MotionController` — same pipeline as every other adapter, source name `"target-position"`.
- Show accepted/rejected feedback inline in the card (reuse whatever pattern PIN Entry or Voice already use for showing a rejection reason).
- Optional nice-to-have, only if time allows: a "Set from current position" button that pre-fills the three inputs with the current end-effector position from the store, so users can nudge from where they already are instead of typing from scratch.

---

## Prompts for Antigravity — paste in order

### Prompt 1 — Build the reusable CollapsibleFeatureCard component
```
Create a reusable CollapsibleFeatureCard component at
components/dashboard/CollapsibleFeatureCard.tsx. Requirements:

1. Props: icon (string/emoji or icon component), title (string),
   description (string, shown when collapsed), defaultOpen (boolean),
   isActive (boolean, for highlighting when this card's source just sent
   a command), children (the actual control content, rendered only when
   expanded).
2. Independent open/closed state per card (useState), NOT a shared
   accordion — multiple cards must be able to be open simultaneously.
3. Clicking the header (icon + title + description + chevron) toggles
   expand/collapse. Animate the expand/collapse with a smooth
   height/opacity transition (200ms or so), not an instant snap.
4. When collapsed: show icon, title, and the one-line description text,
   plus a chevron pointing right. When expanded: chevron points down,
   description can hide or stay (your choice, whichever reads cleaner),
   children render below.
5. When isActive is true, apply a visible highlight (e.g. amber border
   or subtle background tint per the existing design tokens in
   ui-ux.md Section 2) that fades out after ~1.5 seconds — this signals
   "this control just did something" without needing to be permanently
   loud.
6. Accessibility: the header must be a real button (or have
   role="button" + tabIndex), with aria-expanded reflecting open/closed
   state, aria-controls pointing to the content region's id, and a
   visible focus ring on keyboard focus (currently missing per
   ui-ux.md Section 13.4 — fix it here since every card will use this
   component).
7. Use the existing design tokens (colors, typography scale) documented
   in ui-ux.md Sections 2.1-2.3 — don't introduce new colors or font
   sizes outside that system.
```
**Commit:** `feat: add reusable CollapsibleFeatureCard component with accessibility support`

**Checklist:**
- [ ] Two cards can be open at the same time (not exclusive)
- [ ] Keyboard: Tab to a card header, Enter/Space toggles it, focus ring is visible
- [ ] Screen reader (or devtools accessibility tree) shows correct `aria-expanded` state changes
- [ ] Active-highlight animation fades out on its own, doesn't require another click to clear

---

### Prompt 2 — Add the Live Status Strip
```
Create a new component components/dashboard/LiveStatusStrip.tsx: a slim,
always-visible horizontal bar (not a full panel) placed directly below
the header, above the main content area. It shows, reading from the
existing joint-state store:
1. Current end-effector (x, y, z) position, compact format (3 decimal
   places), monospace font per the existing typography scale.
2. The most recent command's status: a small colored dot/label —
   "Accepted" (existing green/success token) or "Rejected: <reason>"
   (existing red/warning token) — reading from the same activity log
   data source the ActivityLogPanel already uses. Do not create a second
   source of truth for this — read the latest entry from the same log.
3. Keep this compact — single row, no wrapping, truncate the rejection
   reason with an ellipsis and full text in a title attribute if it's
   long.
```
**Commit:** `feat: add persistent live status strip showing EE position and last command result`

**Checklist:**
- [ ] Strip updates in real time as commands execute from any source
- [ ] No duplicate log/state array was created — confirmed it reads the same data ActivityLogPanel uses
- [ ] Strip stays a single compact row, doesn't push other content around when a long rejection reason appears

---

### Prompt 3 — Restructure the page layout
```
Restructure app/page.tsx to use the new layout: Header (unchanged) →
LiveStatusStrip (new, from Prompt 2) → two-column area below: 3D Viewer
(unchanged, still the dominant element) on one side, and a vertical list
of CollapsibleFeatureCard instances (from Prompt 1) on the other, in this
exact order:

1. Target Position (defaultOpen=true) — content is a placeholder for now,
   Prompt 4 will fill it in
2. Joystick (defaultOpen=true) — wrap the existing JoystickControl
3. Keyboard (defaultOpen=false) — wrap the existing KeyboardControl
4. PIN Sequence (defaultOpen=false) — wrap the existing PinEntryControl
5. Voice Control (defaultOpen=false) — wrap the existing VoiceControl
6. Agentic AI (defaultOpen=false) — wrap the existing AgenticControl
7. Joint & Position Details (defaultOpen=false) — wrap the existing
   TelemetryPanel
8. Activity Log (defaultOpen=false) — wrap the existing ActivityLogPanel,
   and pass a count badge in the card title showing the current number of
   log entries, e.g. "Activity Log (12)"

Remove the old fixed-width collapsible sidebar mechanism (Section 1.3 of
ui-ux.md, the w-8 collapse behavior) entirely — it's replaced by this
per-card system. Do not change the internal logic of any wrapped
component (JoystickControl, VoiceControl, etc.) — only how they're
positioned and revealed on the page.
```
**Commit:** `refactor: replace fixed sidebar layout with collapsible feature card list`

**Checklist:**
- [ ] All 5 original control components still function exactly as before once expanded (no logic regressions)
- [ ] Target Position and Joystick are open by default on first load; the other 6 are collapsed
- [ ] Old sidebar collapse-to-w-8 mechanism is fully removed, no dead code left behind
- [ ] 3D viewer is still visually dominant in the layout

---

### Prompt 4 — Build the new Target Position control
```
Implement components/controls/TargetPositionControl.tsx per this spec:
1. Three number inputs — X, Y, Z (meters), matching the coordinate frame
   used in key_config.json (base_link frame).
2. A "Go" button that, on click, constructs a moveTo MotionCommand
   ({ type: 'moveTo', target: [x, y, z] }) and sends it through the
   existing MotionController, using "target-position" as the source name
   in AdapterName (extend that union type if needed).
3. Show inline feedback using the same accepted/rejected pattern already
   used elsewhere (e.g. PinEntryControl's step feedback or VoiceControl's
   transcript feedback) — reuse an existing pattern rather than inventing
   a new one.
4. Add a secondary "Use current position" button that reads the current
   end-effector position from the joint-state store and pre-fills the
   three inputs, so users can nudge from where they already are.
5. Basic input validation: reject non-numeric input, show a simple inline
   error rather than silently failing.
Wire this into the Target Position card created in Prompt 3.
```
**Commit:** `feat: implement Target Position control wired to MotionController`

**Checklist:**
- [ ] Entering a reachable (x, y, z) and clicking Go moves the arm there, confirmed via the Live Status Strip
- [ ] Entering an unreachable target shows a clear rejection reason inline
- [ ] "Use current position" correctly pre-fills from the live store, not a stale value
- [ ] Non-numeric input is caught before a command is sent

---

### Prompt 5 — Active-source highlighting across all cards
```
Wire the isActive prop (from Prompt 1's CollapsibleFeatureCard) into the
page so that whichever card's adapter most recently sent a command gets
the highlight treatment for ~1.5 seconds. Use the existing
ActiveSourceBadge/source-tracking logic in the header (per ui-ux.md
Section 1.2) as the source of truth for "which adapter last acted" —
don't build a second tracking mechanism. Map source names to card IDs:
joystick → Joystick card, keyboard → Keyboard card, voice → Voice Control
card, autonomous → PIN Sequence card, agentic → Agentic AI card,
target-position → Target Position card.
```
**Commit:** `feat: highlight the active feature card when its adapter sends a command`

**Checklist:**
- [ ] Triggering each of the 6 adapters (including the new Target Position) highlights the correct, matching card
- [ ] Highlight fades automatically, doesn't require a click to dismiss
- [ ] No new/duplicate "active source" state was introduced — confirmed it reuses the existing header badge logic

---

### Prompt 6 — Polish pass on collapsed-state readability
```
Review all 8 collapsed card headers for readability and consistency:
1. Confirm every card has a concise, accurate one-line description (per
   the table in this document) — rewrite any that are unclear.
2. Confirm icon/emoji choices are visually distinct from each other at a
   glance (no two cards using visually similar icons).
3. Confirm collapsed cards have a consistent height/padding so the list
   doesn't look ragged when several cards are collapsed and one or two
   are expanded.
4. Confirm touch targets on card headers and any icon-only buttons inside
   expanded cards meet at least 44x44px (per ui-ux.md Section 13.4's
   flagged issue) — fix any that don't.
```
**Commit:** `style: polish collapsed card readability and touch target sizing`

**Checklist:**
- [ ] All 8 descriptions read clearly to someone unfamiliar with the project (test this on a teammate who hasn't seen the app)
- [ ] Collapsed list looks visually even/consistent, not ragged
- [ ] Icon-only buttons measured at ≥44x44px

---

## Summary of what this fixes, mapped back to `ui-ux.md` Section 13
- "No visual hierarchy" → 3D viewer stays dominant, cards are secondary, telemetry/log demoted to the bottom of the list.
- "No welcome/initial state, can be overwhelming" → only 2 of 8 cards open by default, rest collapsed with clear descriptions.
- "Missing aria-expanded, aria-controls, focus-visible styles" → built into the new shared card component from the start.
- "Touch targets under 44x44px" → addressed directly in Prompt 6.
- "Sidebar collapse to w-8 too narrow, wasted space" → old mechanism removed entirely, replaced by per-card collapse.
