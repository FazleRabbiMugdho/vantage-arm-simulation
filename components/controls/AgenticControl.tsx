'use client';

import { useState, useRef } from 'react';
import { motionController } from '@/lib/motion/MotionController';
import { useJointStore } from '@/lib/store/jointState';
import VoiceFeedbackPanel from '@/components/voice/VoiceFeedbackPanel';
import type { FeedbackEntry } from '@/components/voice/VoiceFeedbackPanel';

const DEMO_EXCHANGE = [
  { transcript: 'nudge the tip toward the panel and press key 3' },
];

export default function AgenticControl() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const idRef = useRef(0);

  const eePosition = useJointStore((s) => s.eePosition);
  const jointAngles = useJointStore((s) => s.jointAngles);

  const addEntry = (transcript: string, description: string, recognized: boolean): FeedbackEntry => {
    const entry: FeedbackEntry = {
      id: idRef.current++,
      transcript,
      description,
      recognized,
      timestamp: Date.now(),
    };
    setEntries((prev) => [...prev, entry]);
    return entry;
  };

  const updateLastEntry = (description: string, recognized: boolean) => {
    setEntries((prev) => {
      const updated = [...prev];
      if (updated.length === 0) return updated;
      const lastIdx = updated.length - 1;
      updated[lastIdx] = { ...updated[lastIdx], description, recognized };
      return updated;
    });
  };

  const runFallback = async () => {
    setUsingFallback(true);

    addEntry(
      DEMO_EXCHANGE[0].transcript,
      'Gemini unavailable — running demo example.',
      true,
    );

    await new Promise((r) => setTimeout(r, 600));

    // Step 1: Jog toward panel
    const jogResult = motionController.execute(
      { type: 'jog', deltaX: 0.02, deltaY: -0.01, deltaZ: 0 },
      'agentic',
    );
    addEntry(
      '',
      `Nudge toward panel → Jog Δ(0.02, -0.01, 0) ${jogResult.accepted ? '✓' : '✗'}${jogResult.reason ? ' — ' + jogResult.reason : ''}`,
      jogResult.accepted,
    );

    await motionController.waitUntilIdle();

    // Step 2: Press key 3
    const keyResult = motionController.execute(
      { type: 'pressKey', keyIndex: 2 },
      'agentic',
    );
    addEntry(
      '',
      `Press key 3 → ${keyResult.accepted ? '✓ Key pressed' : '✗ ' + (keyResult.reason ?? '')}`,
      keyResult.accepted,
    );
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);
    setUsingFallback(false);

    addEntry(text, 'Analyzing instruction...', true);

    try {
      const res = await fetch('/api/agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            eePosition: Array.from(eePosition),
            jointAngles: Array.from(jointAngles),
          },
        }),
      });

      const data = await res.json();

      if (data.kind === 'command' && data.command) {
        const result = motionController.execute(data.command, 'agentic');
        const explanation = data.explanation || 'Command processed';
        updateLastEntry(
          result.accepted
            ? `${explanation} ✓`
            : `${explanation} ✗ — ${result.reason ?? 'Rejected by controller'}`,
          result.accepted,
        );
      } else if (data.kind === 'question' && data.question) {
        updateLastEntry(`❓ ${data.question}`, false);
      } else {
        updateLastEntry(`✗ ${data.error || 'Unknown response'}`, false);
      }
    } catch {
      // Network or API error — attempt real fallback with demo data
      setEntries((prev) => prev.slice(0, -1)); // remove "Analyzing..." entry
      await runFallback();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="panel-heading">Agentic (AI)</h3>
        {usingFallback && (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-red-400">
            Demo
          </span>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Type an instruction..."
          className="min-w-0 flex-1 rounded border border-gray-700/30 bg-graphite-900 px-3 py-1.5 text-xs text-gray-100 placeholder:text-gray-600 focus:border-red-500/50 focus:outline-none disabled:opacity-40"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
        >
          {loading ? '…' : 'Send'}
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          Consulting agent…
        </div>
      )}

      {/* Feedback panel */}
      <VoiceFeedbackPanel entries={entries} />
    </div>
  );
}
