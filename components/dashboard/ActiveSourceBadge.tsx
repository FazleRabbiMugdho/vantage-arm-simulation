'use client';

import { useJointStore } from '@/lib/store/jointState';
import type { AdapterName } from '@/lib/motion/types';

const SOURCE_LABELS: Record<AdapterName, string> = {
  joystick: 'Joystick',
  keyboard: 'Keyboard',
  voice: 'Voice',
  autonomous: 'PIN Entry',
  agentic: 'Agentic',
};

const SOURCE_COLORS: Record<AdapterName, string> = {
  joystick: 'bg-blue-500 text-blue-100 border-blue-400',
  keyboard: 'bg-purple-500 text-purple-100 border-purple-400',
  voice: 'bg-green-500 text-green-100 border-green-400',
  autonomous: 'bg-amber-500 text-amber-100 border-amber-400',
  agentic: 'bg-red-500 text-red-100 border-red-400',
};

export default function ActiveSourceBadge() {
  const activityLog = useJointStore((s) => s.activityLog);
  const lastEntry = activityLog.length > 0 ? activityLog[activityLog.length - 1] : null;

  if (!lastEntry) {
    return (
      <span className="rounded border border-gray-600 bg-gray-700/50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
        No activity
      </span>
    );
  }

  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        SOURCE_COLORS[lastEntry.source] || 'bg-gray-600 text-gray-200 border-gray-500'
      }`}
    >
      {SOURCE_LABELS[lastEntry.source] || lastEntry.source}
    </span>
  );
}
