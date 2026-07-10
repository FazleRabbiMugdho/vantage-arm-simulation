'use client';

import { useRef, useCallback, useState } from 'react';
import { motionController } from '@/lib/motion/MotionController';

const PAD_SIZE = 160;
const CENTER = PAD_SIZE / 2;
const MAX_RADIUS = CENTER - 4;
const SCALE = 0.000667;
const THROTTLE_MS = 40;
const Z_STEP = 0.008;

export default function JoystickControl() {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastEmit = useRef(0);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number } | null>(null);

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
            ? 'border-sky-400 bg-sky-900/30'
            : 'border-gray-600 bg-gray-800'
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
            className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-400 bg-sky-500/40"
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

      {/* Z controls */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-gray-500">Z</span>
        <button
          onPointerDown={() => emitJog(0, 0, Z_STEP)}
          className="flex h-8 w-8 items-center justify-center rounded border border-gray-600 bg-gray-700 text-sm text-gray-200 hover:bg-gray-600 active:bg-gray-500"
        >
          +
        </button>
        <button
          onPointerDown={() => emitJog(0, 0, -Z_STEP)}
          className="flex h-8 w-8 items-center justify-center rounded border border-gray-600 bg-gray-700 text-sm text-gray-200 hover:bg-gray-600 active:bg-gray-500"
        >
          −
        </button>
        <span className="mt-1 text-[10px] text-gray-500">
          {Z_STEP * 1000}mm
        </span>
      </div>
    </div>
  );
}
