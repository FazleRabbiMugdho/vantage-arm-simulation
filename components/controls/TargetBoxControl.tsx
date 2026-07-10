'use client';

import { useState, useEffect } from 'react';
import { motionController } from '@/lib/motion/MotionController';
import { useJointStore } from '@/lib/store/jointState';

export default function TargetBoxControl() {
  const eePosition = useJointStore((s) => s.eePosition);
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [z, setZ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Auto-fill inputs with current end-effector position on initial load
  useEffect(() => {
    if (eePosition && x === '' && y === '' && z === '') {
      setX(eePosition[0].toFixed(3));
      setY(eePosition[1].toFixed(3));
      setZ(eePosition[2].toFixed(3));
    }
  }, [eePosition]);

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const valX = parseFloat(x);
    const valY = parseFloat(y);
    const valZ = parseFloat(z);

    if (isNaN(valX) || isNaN(valY) || isNaN(valZ)) {
      setError('Please enter valid numeric values for X, Y, and Z.');
      return;
    }

    setIsExecuting(true);

    try {
      const res = motionController.execute(
        {
          type: 'moveTo',
          target: [valX, valY, valZ],
        },
        'autonomous'
      );

      if (res.accepted) {
        setSuccess(true);
        // Wait until arm reaches the target
        await motionController.waitUntilIdle();
      } else {
        setError(res.reason ?? 'Movement request rejected by motion controller.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during movement.');
    } finally {
      setIsExecuting(false);
    }
  };

  const useCurrentPos = () => {
    setX(eePosition[0].toFixed(3));
    setY(eePosition[1].toFixed(3));
    setZ(eePosition[2].toFixed(3));
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="panel-heading">Target Position</h2>
        <button
          onClick={useCurrentPos}
          className="text-[10px] text-gray-500 transition-colors hover:text-amber-400"
          type="button"
        >
          Get Current
        </button>
      </div>

      <form onSubmit={handleMove} className="space-y-3">
        {/* Coordinates Inputs Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* X coordinate */}
          <div className="space-y-1">
            <label htmlFor="target-x" className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              X (m)
            </label>
            <input
              id="target-x"
              type="text"
              inputMode="decimal"
              value={x}
              onChange={(e) => setX(e.target.value)}
              disabled={isExecuting}
              placeholder="0.550"
              className="w-full rounded border border-gray-700/50 bg-graphite-900 px-2.5 py-1.5 text-center font-mono text-xs text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-40"
            />
          </div>

          {/* Y coordinate */}
          <div className="space-y-1">
            <label htmlFor="target-y" className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Y (m)
            </label>
            <input
              id="target-y"
              type="text"
              inputMode="decimal"
              value={y}
              onChange={(e) => setY(e.target.value)}
              disabled={isExecuting}
              placeholder="0.000"
              className="w-full rounded border border-gray-700/50 bg-graphite-900 px-2.5 py-1.5 text-center font-mono text-xs text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-40"
            />
          </div>

          {/* Z coordinate */}
          <div className="space-y-1">
            <label htmlFor="target-z" className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Z (m)
            </label>
            <input
              id="target-z"
              type="text"
              inputMode="decimal"
              value={z}
              onChange={(e) => setZ(e.target.value)}
              disabled={isExecuting}
              placeholder="0.050"
              className="w-full rounded border border-gray-700/50 bg-graphite-900 px-2.5 py-1.5 text-center font-mono text-xs text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-40"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isExecuting}
          className={`w-full rounded px-3 py-1.5 text-xs font-semibold transition-all ${
            isExecuting
              ? 'animate-pulse bg-amber-600 text-white'
              : 'bg-amber-500 text-graphite-950 hover:bg-amber-400 disabled:opacity-40'
          }`}
        >
          {isExecuting ? 'Moving…' : 'Move to Position'}
        </button>
      </form>

      {/* Success / Error Banners */}
      {error && (
        <div className="rounded border border-l-2 border-red-500/30 border-l-red-500 bg-red-500/5 p-2">
          <p className="text-[10px] font-semibold text-red-400">Position Target Rejected</p>
          <p className="text-[10px] text-red-400/80">{error}</p>
        </div>
      )}

      {success && !error && (
        <div className="rounded border border-l-2 border-green-500/30 border-l-green-500 bg-green-500/5 p-2">
          <p className="text-[10px] font-semibold text-green-400">Target Accepted</p>
          <p className="text-[10px] text-green-400/80">Command sent to joint controller.</p>
        </div>
      )}
    </div>
  );
}
