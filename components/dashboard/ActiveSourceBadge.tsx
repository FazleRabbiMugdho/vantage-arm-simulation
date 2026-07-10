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
  joystick: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  keyboard: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  voice: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  autonomous: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  agentic: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const SOURCE_ICONS: Record<AdapterName, string> = {
  joystick: '◎',
  keyboard: '⌨',
  voice: '🎙',
  autonomous: '⚡',
  agentic: '🤖',
};

export default function ActiveSourceBadge() {
  const activityLog = useJointStore((s) => s.activityLog);
  const lastEntry = activityLog.length > 0 ? activityLog[activityLog.length - 1] : null;

  if (!lastEntry) {
    return (
      <span className="rounded border border-gray-700/50 bg-graphite-700 px-2.5 py-1 text-[10px] font-medium tracking-wider text-gray-600">
        ● Idle
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
        SOURCE_COLORS[lastEntry.source] || 'bg-gray-600 text-gray-200 border-gray-500'
      }`}
    >
      <span>{SOURCE_ICONS[lastEntry.source] || '●'}</span>
      {SOURCE_LABELS[lastEntry.source] || lastEntry.source}
    </span>
  );
}
