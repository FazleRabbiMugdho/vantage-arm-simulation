# Voice Control — Working Mechanism

## Overview

Voice control lets the user command the robotic arm through spoken phrases. It uses the browser's native **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) — no external services or API keys required. Speech is captured, transcribed, parsed deterministically via regex, and dispatched through the shared `MotionController` pipeline under the source adapter name `"voice"`.

## Architecture (4-layer stack)

```
┌──────────────────────────────────────────────┐
│  components/controls/VoiceControl.tsx         │  ← UI: mic button, state display, command ref
├──────────────────────────────────────────────┤
│  components/voice/VoiceFeedbackPanel.tsx      │  ← Reusable: transcript + parsed command history
├──────────────────────────────────────────────┤
│  lib/voice/commandParser.ts                   │  ← Regex parser (jog / rotateJoint / pressKey)
├──────────────────────────────────────────────┤
│  lib/voice/speechRecognition.ts               │  ← Web Speech API wrapper (raw audio → text)
└──────────────────────────────────────────────┘
                            │
                            ▼
                   MotionController.execute(cmd, 'voice')
                            │
                            ▼
                   IK solver → animate → joint store
```

---

## Layer 1 — `lib/voice/speechRecognition.ts`

**File:** `lib/voice/speechRecognition.ts`

Wraps the browser's `webkitSpeechRecognition` API into a clean interface:

```typescript
export interface SpeechRecognizer {
  start: () => void;
  stop: () => void;
  isSupported: () => boolean;
  getState: () => SpeechState;  // 'idle' | 'listening' | 'error'
}
```

### Initialization
- Checks for `window.SpeechRecognition || window.webkitSpeechRecognition`
- If unavailable, sets state to `'error'` with a readable message (supports only Chrome, Edge, Safari)

### `start()`
1. Creates a new `SpeechRecognition` instance
2. Sets `continuous: true` — recognition keeps running across speech pauses
3. Sets `interimResults: true` — receives partial (live) transcript while speaking
4. Sets `lang: 'en-US'`
5. Binds three event handlers:
   - **`onresult`** — iterates `event.results`, separates `isFinal` from interim results, calls `onInterimResult` (live) and `onResult` (final) callbacks
   - **`onerror`** — handles `not-allowed` (mic permission denied), `no-speech` (silently ignored), and generic errors
   - **`onend`** — if `shouldRestart` flag is set (user is still listening), automatically restarts recognition; otherwise sets state to `'idle'`

### `stop()`
1. Sets `shouldRestart = false` (prevents `onend` from re-starting)
2. Calls `recognition.stop()` and nulls the reference
3. Sets state to `'idle'`

### Error handling
| Condition | Behavior |
|-----------|----------|
| API not supported | Shows message: "Please use Chrome, Edge, or Safari" |
| Mic permission denied | Shows message: "Microphone permission denied" |
| No speech detected | Silently ignored — browser keeps listening |
| Runtime error | Shows generic error and sets `'error'` state |

---

## Layer 2 — `lib/voice/commandParser.ts`

**File:** `lib/voice/commandParser.ts`

A deterministic, regex-based parser (no AI/LLM). Returns:

```typescript
interface ParsedCommand {
  recognized: boolean;
  description: string;       // Human-readable, e.g. "Jog up" or "✗ Not recognized"
  command: MotionCommand | null; // null when unrecognized
}
```

### Command type 1: Press Key

**Pattern:** `press key N`, `press N`, `hit key N`, `go to key N`, `type N`

```regex
/^(?:press|hit|type|go\s*to)\s+(?:key\s*)?(\d)$/
```

- Validates N is 1-6 (only 6 keys exist)
- Maps to `{ type: 'pressKey', keyIndex: N-1 }`
- Invalid key number returns `recognized: false` with description "Key N is out of range (1-6)"

### Command type 2: Jog (Move)

**Pattern:** `move up`, `go forward`, `move left 10 cm`, `move up 50mm`

```regex
/^(?:move|go)\s+(up|down|left|right|forward|back)(?:\s+(\d+(?:\.\d+)?)\s*(mm|cm|meters?|centimeters?))?\s*$/
```

- Six directions, each mapped to an XYZ delta:
  | Direction | Delta (default) |
  |-----------|----------------|
  | up | `(0, 0, +0.05)` |
  | down | `(0, 0, -0.05)` |
  | left | `(0, -0.05, 0)` |
  | right | `(0, +0.05, 0)` |
  | forward | `(+0.05, 0, 0)` |
  | back | `(-0.05, 0, 0)` |
- Optional distance suffix: `10 cm`, `50 mm`, `0.1 meters`
- Default step: **5 cm** (`0.05 m`)
- Maps to `{ type: 'jog', deltaX, deltaY, deltaZ }`

### Command type 3: Rotate Joint

**Pattern:** `rotate joint 3 left 10 degrees`, `rotate base right 5 degrees`, `rotate joint 2 left 25 degrees`

```regex
/^rotate\s+(?:joint\s*)?(\d+|base)\s+(left|right)\s*(\d+)\s*degrees?\s*$/
```

- `base` maps to joint index 0 (`joint_1`)
- Joint numbers are 1-based for user friendliness (joint 1 = index 0)
- Validates joint index is 0-6 (7 joints total)
- `left` = positive degrees, `right` = negative degrees
- Maps to `{ type: 'rotateJoint', joint: N, degrees: signed }`

### Unrecognized phrases

Any text not matching the above patterns returns:
```
{ recognized: false, description: 'Command not recognized', command: null }
```

This is displayed explicitly as **"✗ Not recognized"** in the UI (no silent failures).

---

## Layer 3 — `components/voice/VoiceFeedbackPanel.tsx`

**File:** `components/voice/VoiceFeedbackPanel.tsx`

A **reusable** UI component designed to be shared with Prompt 14's agentic bonus. Not coupled to voice-specific logic.

### Props

```typescript
interface VoiceFeedbackPanelProps {
  entries: FeedbackEntry[];          // History of all interactions
  currentTranscript?: string;        // Most recent final transcript
  currentDescription?: string;       // Parsed command description or error
  currentRecognized?: boolean;       // Was the last command recognized?
  interimTranscript?: string;        // Live partial transcript (while speaking)
}

interface FeedbackEntry {
  id: number;
  transcript: string;       // What the user said
  description: string;      // What was parsed / system response
  recognized: boolean;      // Was it successfully processed?
  timestamp: number;
}
```

### Display sections

1. **Listening...** (dashed border) — shows live interim transcript as the user speaks
2. **Latest** (solid border) — shows the most recent finalized transcript and its parse result
3. **Hint** — "Click the mic button and speak" when no activity exists
4. **History** — scrollable reverse-chronological list of all entries with timestamps

---

## Layer 4 — `components/controls/VoiceControl.tsx`

**File:** `components/controls/VoiceControl.tsx`

The main UI component that wires everything together.

### Mic button states

| State | Visual | Behavior |
|-------|--------|----------|
| `idle` | Gray border, gray icon | Click to start listening |
| `listening` | Green border, green icon, pulsing dot | Shows "Listening...", click to stop |
| `error` | Yellow border, yellow icon | Shows error message, click to retry |

### Data flow on speech result

```
Speech recognized
  ↓
onResult(text) fires in speechRecognition.ts
  ↓
VoiceControl sets interimTranscript = ''
VoiceControl sets transcript = text
  ↓
parseCommand(text) runs in commandParser.ts
  ↓
ParsedCommand returned (recognized + description + command)
  ↓
FeedbackEntry created and appended to entries[]
  ↓
If recognized → motionController.execute(command, 'voice')
  ↓
MotionController logs entry with source 'voice'
```

### Command reference

A collapsible `<details>` element lists all supported command formats for the user.

### Error banners

- **Unsupported browser** — yellow banner with instructions to use Chrome/Edge/Safari
- **Permission denied** — yellow banner with instruction to allow mic access
- **Runtime error** — yellow banner with error details

---

## Integration with MotionController

**File:** `lib/motion/MotionController.ts`

All commands from voice are dispatched via:
```typescript
motionController.execute(command, 'voice')
```

The `MotionController`:
1. Validates the command (`resolveAndValidate`)
2. Creates a `LogEntry` with `source: 'voice'`
3. Stores the log entry in `useJointStore.activityLog`
4. If accepted, runs `animateTo(newAngles)` which interpolates joint angles over 200ms

### Command type routing in MotionController

| Command type | Handler | What it does |
|-------------|---------|-------------|
| `jog` | `handleJog` | Reads current `eePosition` from store, adds delta, calls IK |
| `rotateJoint` | `handleRotateJoint` | Adds delta radians to specified joint, validates against limits |
| `pressKey` | `handlePressKey` | Looks up key XYZ from `KEY_POSITIONS`, calls IK |

---

## State diagram

```
         ┌─────────────────────────────────┐
         │          IDLE                    │
         │  (gray mic, not listening)       │
         └──────┬──────────────────────────┘
                │ click mic
                ▼
         ┌─────────────────────────────────┐
    ┌───│       LISTENING                  │◄──── onend (auto-restart)
    │   │  (green mic, pulsing dot)        │──────► interim text → listening...
    │   └──────┬──────────────────────────┘
    │          │ speech finalized
    │          ▼
    │   ┌──────────────────────────┐
    │   │ Parse + execute          │
    │   │ → Latest box updates     │
    │   │ → History entry added    │
    │   └──────────────────────────┘
    │          │
    └──────────┘ (back to listening)
    
    click mic while listening:
    ┌─────────────────────────────────┐
    │  IDLE / STOPPED                 │
    └─────────────────────────────────┘

    error:
    ┌─────────────────────────────────┐
    │  ERROR                          │
    │  (yellow mic, message banner)   │
    └─────────────────────────────────┘
         │
         └── click mic → retry → LISTENING
```

---

## File inventory

| File | Role |
|------|------|
| `lib/voice/speechRecognition.ts` | Web Speech API wrapper |
| `lib/voice/commandParser.ts` | Deterministic regex command parser |
| `components/voice/VoiceFeedbackPanel.tsx` | Reusable transcript/feedback display |
| `components/controls/VoiceControl.tsx` | Mic button, state management, UI |
| `lib/motion/MotionController.ts` | Command validation, IK solving, animation |
| `lib/motion/types.ts` | `MotionCommand` type definitions |
| `app/page.tsx` | Mounts VoiceControl in controls panel |

---

## Debugging

Open **F12 DevTools → Console**. Look for `[Voice]` prefixed logs:

| Log | Meaning |
|-----|---------|
| `[Voice] Web Speech API available: true/false` | Whether the browser supports the API |
| `[Voice] state: listening` | Mic is active and listening |
| `[Voice] interim: ...` | Live partial transcript while speaking |
| `[Voice] final: ...` | Completed speech phrase |
| `[Voice] parsed: {recognized: true/false, ...}` | Result of the regex parser |
| `[Voice] executing: {type: 'jog', ...}` | Command being sent to MotionController |
| `[Voice] error: ...` | Any error that occurred |

**Common issues:**
- **Browser**: Only Chrome, Edge, Safari support Web Speech API
- **HTTPS**: Required for mic access (OK on `localhost`, requires HTTPS on network)
- **Permission**: Check browser URL bar for blocked mic icon
- **Accuracy**: Speak clearly, minimize background noise
