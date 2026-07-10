export type SpeechState = 'idle' | 'listening' | 'error';

export interface SpeechCallbacks {
  onResult: (text: string) => void;
  onInterimResult?: (text: string) => void;
  onStateChange: (state: SpeechState) => void;
  onError: (message: string) => void;
}

export interface SpeechRecognizer {
  start: () => void;
  stop: () => void;
  isSupported: () => boolean;
  getState: () => SpeechState;
}

export function createSpeechRecognizer(callbacks: SpeechCallbacks): SpeechRecognizer {
  let state: SpeechState = 'idle';
  let recognition: any = null;
  let shouldRestart = false;

  const SpeechRecognitionAPI =
    (typeof window !== 'undefined' && (window as any).SpeechRecognition) ||
    (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) ||
    null;

  function isSupported(): boolean {
    return SpeechRecognitionAPI !== null;
  }

  function getState(): SpeechState {
    return state;
  }

  function setState(newState: SpeechState) {
    state = newState;
    callbacks.onStateChange(newState);
  }

  function start() {
    if (!SpeechRecognitionAPI) {
      callbacks.onError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'
      );
      setState('error');
      return;
    }

    try {
      recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (interimTranscript.trim()) {
          callbacks.onInterimResult?.(interimTranscript.trim());
        }
        if (finalTranscript.trim()) {
          callbacks.onResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          callbacks.onError(
            'Microphone permission denied. Please allow microphone access in your browser settings.'
          );
          setState('error');
        } else if (event.error === 'no-speech') {
          // Browser continues listening — no action needed
        } else {
          callbacks.onError(`Speech recognition error: ${event.error}`);
          setState('error');
        }
      };

      recognition.onend = () => {
        if (shouldRestart) {
          try {
            recognition?.start();
          } catch {
            setState('error');
          }
        } else {
          setState('idle');
        }
      };

      shouldRestart = true;
      recognition.start();
      setState('listening');
    } catch {
      callbacks.onError('Failed to start speech recognition.');
      setState('error');
    }
  }

  function stop() {
    shouldRestart = false;
    if (recognition) {
      try { recognition.stop(); } catch { /* ignore */ }
      recognition = null;
    }
    setState('idle');
  }

  return { start, stop, isSupported, getState };
}
