'use client';

export interface FeedbackEntry {
  id: number;
  transcript: string;
  description: string;
  recognized: boolean;
  timestamp: number;
}

interface VoiceFeedbackPanelProps {
  entries: FeedbackEntry[];
  currentTranscript?: string;
  currentDescription?: string;
  currentRecognized?: boolean;
  interimTranscript?: string;
}

export default function VoiceFeedbackPanel({
  entries,
  currentTranscript,
  currentDescription,
  currentRecognized,
  interimTranscript,
}: VoiceFeedbackPanelProps) {
  return (
    <div className="space-y-2">
      {/* Live interim result (shows while speaking) */}
      {interimTranscript && (
        <div className="rounded border border-dashed border-amber-500/20 bg-amber-500/5 p-2">
          <p className="panel-heading">
            Listening…
          </p>
          <p className="text-sm italic text-amber-400/70">&ldquo;{interimTranscript}&rdquo;</p>
        </div>
      )}

      {/* Final result */}
      {currentTranscript && (
        <div className="rounded border border-gray-700/30 bg-graphite-700/30 p-2">
          <p className="panel-heading">
            Latest
          </p>
          <p className="text-sm text-gray-100">&ldquo;{currentTranscript}&rdquo;</p>
          <p
            className={`text-xs font-medium ${
              currentRecognized ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {currentRecognized ? `→ ${currentDescription}` : '✗ Not recognized'}
          </p>
        </div>
      )}

      {/* Empty state hint */}
      {!interimTranscript && !currentTranscript && entries.length === 0 && (
        <p className="text-[10px] text-gray-600 italic">
          Click the mic button and speak. Transcript appears here.
        </p>
      )}

      {/* History */}
      {entries.length > 0 && (
        <div className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain rounded border border-gray-700/30 bg-graphite-900/50 p-2">
          <p className="panel-heading mb-1">
            History
          </p>
          {entries.slice().reverse().map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 rounded px-1 py-0.5 text-[11px]"
            >
              <span className="mt-0.5 shrink-0 font-mono text-gray-600">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-gray-300">
                  &ldquo;{entry.transcript}&rdquo;
                </p>
                <p
                  className={
                    entry.recognized ? 'text-green-400' : 'text-red-400'
                  }
                >
                  {entry.recognized
                    ? `→ ${entry.description}`
                    : '✗ Not recognized'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
