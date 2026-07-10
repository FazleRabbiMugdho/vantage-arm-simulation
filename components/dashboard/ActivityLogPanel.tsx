'use client';

import { useJointStore } from '@/lib/store/jointState';
import type { MotionCommand, AdapterName } from '@/lib/motion/types';

const SOURCE_LABELS: Record<AdapterName, string> = {
  joystick: 'Joystick',
  keyboard: 'Keyboard',
  voice: 'Voice',
  autonomous: 'PIN',
  agentic: 'Agent',
};

function commandSummary(cmd: MotionCommand): string {
  switch (cmd.type) {
    case 'jog':
      return `Jog Δ(${cmd.deltaX.toFixed(3)}, ${cmd.deltaY.toFixed(3)}, ${cmd.deltaZ.toFixed(3)})`;
    case 'moveTo':
      return `Move → (${cmd.target[0].toFixed(3)}, ${cmd.target[1].toFixed(3)}, ${cmd.target[2].toFixed(3)})`;
    case 'rotateJoint':
      return `Rotate J${cmd.joint + 1} ${cmd.degrees > 0 ? '+' : ''}${cmd.degrees}°`;
    case 'pressKey':
      return `Press key ${cmd.keyIndex + 1}`;
  }
}

export default function ActivityLogPanel() {
  const activityLog = useJointStore((s) => s.activityLog);
  const clearLog = useJointStore((s) => s.clearLog);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="panel-heading">
          Activity Log
        </h3>
        {activityLog.length > 0 && (
          <button
            onClick={clearLog}
            className="text-[10px] text-gray-600 transition-colors hover:text-amber-400"
          >
            Clear
          </button>
        )}
      </div>

      {activityLog.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded border border-dashed border-gray-700/40 bg-graphite-700/30 px-3 py-5">
          <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-[10px] text-gray-600">
            No commands yet. Use any control to see activity.
          </p>
        </div>
      ) : (
        <div className="max-h-60 space-y-0.5 overflow-y-auto overscroll-contain rounded border border-gray-700/30 bg-graphite-900/50 p-1.5">
          {activityLog.slice().reverse().map((entry, i) => (
            <div
              key={activityLog.length - 1 - i}
              className={`rounded px-2 py-1 text-[10px] ${
                  entry.result.accepted
                    ? 'border-l-2 border-l-green-500/60 bg-green-500/10'
                    : 'border-l-2 border-l-red-500/50 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 font-mono text-gray-600">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="shrink-0 font-medium text-amber-500/80">
                  {SOURCE_LABELS[entry.source] || entry.source}
                </span>
                <span className="min-w-0 whitespace-nowrap text-gray-400">
                  {entry.description ?? commandSummary(entry.command)}
                </span>
                <span className={`shrink-0 font-bold ${entry.result.accepted ? 'text-green-500' : 'text-red-400'}`}>
                  {entry.result.accepted ? '✓' : '✗'}
                </span>
              </div>
              {!entry.result.accepted && entry.result.reason && (
                <p className="mt-0.5 truncate pl-12 text-red-400/70">
                  {entry.result.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
