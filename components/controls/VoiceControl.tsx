'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motionController } from '@/lib/motion/MotionController';
import { createSpeechRecognizer } from '@/lib/voice/speechRecognition';
import { parseCommand } from '@/lib/voice/commandParser';
import type { SpeechRecognizer, SpeechState } from '@/lib/voice/speechRecognition';
import type { ParsedCommand } from '@/lib/voice/commandParser';
import VoiceFeedbackPanel from '@/components/voice/VoiceFeedbackPanel';
import type { FeedbackEntry } from '@/components/voice/VoiceFeedbackPanel';

export default function VoiceControl() {
  const [state, setState] = useState<SpeechState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [currentParse, setCurrentParse] = useState<ParsedCommand | null>(null);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [supported, setSupported] = useState(true);

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const recognizer = createSpeechRecognizer({
      onResult: (text: string) => {
        setTranscript(text);
        const parsed = parseCommand(text);
        setCurrentParse(parsed);

        const entry: FeedbackEntry = {
          id: idRef.current++,
          transcript: text,
          description: parsed.description,
          recognized: parsed.recognized,
          timestamp: Date.now(),
        };
        setEntries((prev) => [...prev, entry]);

        if (parsed.recognized && parsed.command) {
          motionController.execute(parsed.command, 'voice');
        }
      },
      onStateChange: (newState: SpeechState) => {
        setState(newState);
        if (newState !== 'error') {
          setErrorMessage(null);
        }
      },
      onError: (message: string) => {
        setErrorMessage(message);
      },
    });

    recognizerRef.current = recognizer;

    if (!recognizer.isSupported()) {
      setSupported(false);
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'
      );
    }

    return () => {
      recognizer.stop();
    };
  }, []);

  const toggleListening = useCallback(() => {
    const r = recognizerRef.current;
    if (!r) return;

    if (state === 'listening') {
      r.stop();
      setTranscript('');
      setCurrentParse(null);
    } else {
      setErrorMessage(null);
      setTranscript('');
      setCurrentParse(null);
      r.start();
    }
  }, [state]);

  const isListening = state === 'listening';
  const isError = state === 'error' || !supported;

  const stateButtonClass = isListening
    ? 'border-green-500 text-green-400 bg-green-900/20'
    : isError
      ? 'border-yellow-600 text-yellow-400 bg-yellow-900/20'
      : 'border-gray-600 text-gray-400 hover:bg-gray-700';

  const stateLabel = isListening
    ? 'Listening...'
    : isError
      ? 'Error'
      : 'Start Listening';

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Mic toggle */}
        <button
          onClick={toggleListening}
          disabled={!supported}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${stateButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
          title={stateLabel}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Voice Control
          </p>
          <p
            className={`text-[11px] ${
              isListening
                ? 'text-green-400'
                : isError
                  ? 'text-yellow-400'
                  : 'text-gray-500'
            }`}
          >
            {errorMessage || stateLabel}
          </p>
        </div>

        {/* Live indicator dot */}
        {isListening && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        )}
      </div>

      {/* Unsupported / error message banner */}
      {!supported && errorMessage && (
        <div className="rounded border border-yellow-700 bg-yellow-900/30 px-3 py-2">
          <p className="text-xs text-yellow-300">{errorMessage}</p>
        </div>
      )}

      {/* Permission / runtime error banner */}
      {supported && isError && errorMessage && (
        <div className="rounded border border-yellow-700 bg-yellow-900/30 px-3 py-2">
          <p className="text-xs text-yellow-300">{errorMessage}</p>
        </div>
      )}

      {/* Feedback panel */}
      <VoiceFeedbackPanel
        entries={entries}
        currentTranscript={transcript || undefined}
        currentDescription={currentParse?.description}
        currentRecognized={currentParse?.recognized}
      />
    </div>
  );
}
