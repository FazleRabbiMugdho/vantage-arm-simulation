'use client';

import { useRef, useCallback, useState } from 'react';
import { motionController } from '@/lib/motion/MotionController';

const PAD_SIZE = 160;
const CENTER = PAD_SIZE / 2;
const MAX_RADIUS = CENTER - 4;
const SCALE = 0.005; // Increased scale for debugging — makes arm movement more visible per drag distance
const THROTTLE_MS = 40;

export default function JoystickControl() {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastEmit = useRef(0);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number } | null>(null);
  const [stepSize, setStepSize] = useState(0.050); // Default to 50mm for debugging — visible movement per click

  const emitJog = useCallback((dx: number, dy: number, dz: number) => {
    const now = Date.now();
    if (now - lastEmit.current < THROTTLE_MS) return;
    lastEmit.current = now;
    motionController.execute(
      { type: 'jog', deltaX: dx, deltaY: dy, deltaZ: dz },
      'joystick',
    );
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    setActive(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerMove(e);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const rect = padRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - CENTER;
    const dy = y - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = dist > MAX_RADIUS;
    const clampX = clamped ? (dx / dist) * MAX_RADIUS : dx;
    const clampY = clamped ? (dy / dist) * MAX_RADIUS : dy;
    setKnobPos({ x: clampX, y: clampY });
    emitJog(clampX * SCALE, -clampY * SCALE, 0);
  }, [emitJog]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    setActive(false);
    setKnobPos(null);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {/* XY pad */}
        <div
          ref={padRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative cursor-crosshair select-none rounded-lg border-2 transition-colors ${
            active
              ? 'border-amber-500 bg-amber-900/10'
              : 'border-gray-700/50 bg-graphite-700'
          }`}
          style={{ width: PAD_SIZE, height: PAD_SIZE, touchAction: 'none' }}
        >
          {/* Crosshair lines */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-600/50" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gray-600/50" />
          </div>
          {/* Knob */}
          {knobPos && (
            <div
              className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              style={{ left: CENTER + knobPos.x, top: CENTER + knobPos.y }}
            />
          )}
          {/* Labels */}
          <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[10px] text-gray-500">
            Y
          </span>
          <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">
            Y-
          </span>
          <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
            X-
          </span>
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
            X
          </span>
        </div>

        {/* Manual Axis Jog Buttons */}
        <div className="flex gap-2.5">
          {/* X controls */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-gray-400">X</span>
            <button
              onPointerDown={() => emitJog(stepSize, 0, 0)}
              className="ctrl-btn h-8 w-8 text-sm font-bold"
              title="Move X+"
            >
              +
            </button>
            <button
              onPointerDown={() => emitJog(-stepSize, 0, 0)}
              className="ctrl-btn h-8 w-8 text-sm font-bold"
              title="Move X-"
            >
              −
            </button>
          </div>

          {/* Y controls */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-gray-400">Y</span>
            <button
              onPointerDown={() => emitJog(0, stepSize, 0)}
              className="ctrl-btn h-8 w-8 text-sm font-bold"
              title="Move Y+"
            >
              +
            </button>
            <button
              onPointerDown={() => emitJog(0, -stepSize, 0)}
              className="ctrl-btn h-8 w-8 text-sm font-bold"
              title="Move Y-"
            >
              −
            </button>
          </div>

          {/* Z controls */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-gray-400">Z</span>
            <button
              onPointerDown={() => emitJog(0, 0, stepSize)}
              className="ctrl-btn h-8 w-8 text-sm font-bold"
              title="Move Z+"
            >
              +
            </button>
            <button
              onPointerDown={() => emitJog(0, 0, -stepSize)}
              className="ctrl-btn h-8 w-8 text-sm font-bold"
              title="Move Z-"
            >
              −
            </button>
          </div>
        </div>
      </div>

      {/* Step size selector */}
      <div className="flex flex-col gap-1.5 border-t border-gray-700/50 pt-3">
        <span className="panel-heading">
          Jog Step Size
        </span>
        <div className="flex rounded bg-gray-900/50 p-0.5">
          {[0.010, 0.025, 0.050, 0.100].map((val) => (
            <button
              key={val}
              onClick={() => setStepSize(val)}
              className={`flex-1 rounded px-2 py-1 text-center font-mono text-[10px] font-medium transition-colors ${
                stepSize === val
                  ? 'bg-amber-500 text-graphite-950 font-bold'
                  : 'text-gray-500 hover:bg-graphite-600 hover:text-gray-300'
              }`}
            >
              {val * 1000}mm
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
