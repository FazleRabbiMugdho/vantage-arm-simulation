# Audit: Prompt 11 — Voice Control

**Mode:** Build
**Date:** 2026-07-10
**Branch:** feat/autonomous-pin-entry
**Commit:** `feat: add voice control via Web Speech API mapped to the shared pipeline`

## What was done

- Created `lib/voice/speechRecognition.ts` — Web Speech API wrapper with start/stop/state management, handles unsupported browser, permission denied, and runtime errors
- Created `lib/voice/commandParser.ts` — deterministic regex-based parser supporting:
  - "move up/down/left/right/forward/back" → `jog` commands (with optional distance in mm/cm/m)
  - "rotate joint N/base left/right N degrees" → `rotateJoint` commands
  - "press key N", "press N", "hit key N", "go to key N", "type N" → `pressKey` commands
- Created `components/voice/VoiceFeedbackPanel.tsx` — reusable feedback component showing transcript + parsed command + history with timestamps, designed for reuse by Prompt 14's agentic bonus
- Created `components/controls/VoiceControl.tsx` — mic toggle button with visual states (listening/idle/error), live transcript display, error banners, and command dispatch via `motionController.execute(cmd, 'voice')`
- Wired `VoiceControl` into `page.tsx` controls panel between PIN Entry and Keyboard

## Problems solved

- Unrecognized speech phrases show "✗ Not recognized" in red — no silent failures
- Web Speech API type declarations handled via `(window as any)` pattern since TS DOM lib may not include them
- Continuous listening restarts on `onend` until user explicitly stops
- `no-speech` error is silently ignored (browser keeps listening)

## Verification checklist

- [x] At least the 3 required command types (jog phrases, rotate phrases, "press key N") are correctly recognized and executed
- [x] Transcript displays what was heard, distinct from what was parsed
- [x] An unrecognized phrase shows a clear "not recognized" state, not silence
- [x] Activity log shows "voice" as the source for these commands (via `motionController.execute(cmd, 'voice')`)
- [x] Mic permission denial / unsupported browser shows a readable message instead of a silent failure

## Files created / modified

### Created
- `lib/voice/speechRecognition.ts` — Web Speech API wrapper
- `lib/voice/commandParser.ts` — regex command parser
- `components/voice/VoiceFeedbackPanel.tsx` — reusable feedback display
- `components/controls/VoiceControl.tsx` — voice control UI component

### Modified
- `app/page.tsx` — added VoiceControl import and rendered in controls panel

## State after prompt

Voice control is functional in the controls panel. The microphone button toggles listening/stopped state with visual indicator. Speech is parsed deterministically and commands flow through MotionController with source `'voice'`. History is maintained in the feedback panel. The VoiceFeedbackPanel component is ready for reuse by the agentic bonus (Prompt 14).
