'use client';

import { useJointStore } from '@/lib/store/jointState';
import type { MotionCommand, AdapterName } from '@/lib/motion/types';

const SOURCE_LABELS: Record<AdapterName, string> = {
  joystick: 'Joystick',
  keyboard: 'Keyboard',
  voice: 'Voice',
  autonomous: 'PIN Entry',
  agentic: 'Agentic',
};

const SOURCE_COLORS: Record<AdapterName, string> = {
  joystick: 'text-blue-400',
  keyboard: 'text-purple-400',
  voice: 'text-green-400',
  autonomous: 'text-amber-400',
  agentic: 'text-red-400',
};

const SOURCE_BG: Record<AdapterName, string> = {
  joystick: 'bg-blue-500/10',
  keyboard: 'bg-purple-500/10',
  voice: 'bg-green-500/10',
  autonomous: 'bg-amber-500/10',
  agentic: 'bg-red-500/10',
};

function commandSummary(cmd: MotionCommand): string {
  switch (cmd.type) {
    case 'jog':
      return `Jog Δ(${cmd.deltaX.toFixed(3)}, ${cmd.deltaY.toFixed(3)}, ${cmd.deltaZ.toFixed(3)})`;
    case 'moveTo':
      return `Move to (${cmd.target[0].toFixed(3)}, ${cmd.target[1].toFixed(3)}, ${cmd.target[2].toFixed(3)})`;
    case 'rotateJoint':
      return `Rotate joint ${cmd.joint} by ${cmd.degrees}°`;
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Activity Log
        </h3>
        {activityLog.length > 0 && (
          <button
            onClick={clearLog}
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {activityLog.length === 0 ? (
        <p className="text-[10px] italic text-gray-600">
          No commands yet. Use any control to see activity.
        </p>
      ) : (
        <div className="max-h-60 space-y-0.5 overflow-y-auto overscroll-contain rounded border border-gray-700 bg-gray-900/50 p-2">
          {activityLog.slice().reverse().map((entry, i) => (
            <div
              key={activityLog.length - 1 - i}
              className={`rounded px-1.5 py-1 text-[10px] ${SOURCE_BG[entry.source] || 'bg-gray-800/50'}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-gray-600 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className={`font-semibold shrink-0 ${SOURCE_COLORS[entry.source] || 'text-gray-400'}`}>
                  {SOURCE_LABELS[entry.source] || entry.source}
                </span>
                <span className="text-gray-300 truncate">
                  {commandSummary(entry.command)}
                </span>
                <span className={`shrink-0 font-bold ${entry.result.accepted ? 'text-green-500' : 'text-red-400'}`}>
                  {entry.result.accepted ? '✓' : '✗'}
                </span>
              </div>
              {!entry.result.accepted && entry.result.reason && (
                <p className="mt-0.5 text-red-400/80 truncate pl-[4.5rem]">
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
