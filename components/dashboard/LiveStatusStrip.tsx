'use client';

import { useJointStore } from '@/lib/store/jointState';

export default function LiveStatusStrip() {
  const eePosition = useJointStore((s) => s.eePosition);
  const activityLog = useJointStore((s) => s.activityLog);

  const lastEntry = activityLog.length > 0 ? activityLog[activityLog.length - 1] : null;

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/20 bg-graphite-950/40 px-6 py-1.5 text-xs text-gray-400">
      {/* End-Effector Position */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          EE Position:
        </span>
        <div className="font-mono text-gray-200 flex gap-3">
          <span>
            X: <strong className="text-gray-100 font-semibold">{eePosition[0].toFixed(3)}</strong>m
          </span>
          <span>
            Y: <strong className="text-gray-100 font-semibold">{eePosition[1].toFixed(3)}</strong>m
          </span>
          <span>
            Z: <strong className="text-gray-100 font-semibold">{eePosition[2].toFixed(3)}</strong>m
          </span>
        </div>
      </div>

      {/* Last Command Status */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 shrink-0">
          Status:
        </span>
        {lastEntry ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                lastEntry.result.accepted ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            {lastEntry.result.accepted ? (
              <span className="text-green-400 font-medium truncate">
                Command Accepted
              </span>
            ) : (
              <span
                className="text-red-400 font-medium truncate"
                title={lastEntry.result.reason || 'Rejected'}
              >
                Rejected: {lastEntry.result.reason || 'Unknown error'}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-600 italic">No commands executed</span>
        )}
      </div>
    </div>
  );
}
