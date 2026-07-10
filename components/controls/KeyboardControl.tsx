'use client';

import { useEffect, useState, useRef } from 'react';
import { motionController } from '@/lib/motion/MotionController';
import { JOINT_NAMES } from '@/lib/config/jointLimits';

const JOG_STEP = 0.025;
const THROTTLE_MS = 180;

function toLabel(name: string) {
  return name.replace('joint_', 'J').replace('stylus_pitch', 'SP');
}

export default function KeyboardControl() {
  const [activeJoint, setActiveJoint] = useState(0);
  const [stepDeg, setStepDeg] = useState(5);
  const lastEmit = useRef(0);

  const emit = (cmd: { type: string; [key: string]: unknown }) => {
    const now = Date.now();
    if (now - lastEmit.current < THROTTLE_MS) return;
    lastEmit.current = now;
    motionController.execute(cmd as any, 'keyboard');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.tagName === 'SELECT' ||
          (document.activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastEmit.current < THROTTLE_MS) return;

      const shift = e.shiftKey;
      let command: { type: string; [key: string]: unknown } | null = null;

      switch (e.key.toLowerCase()) {
        case 'w':
          command = shift
            ? { type: 'jog', deltaX: 0, deltaY: 0, deltaZ: JOG_STEP }
            : { type: 'jog', deltaX: 0, deltaY: JOG_STEP, deltaZ: 0 };
          break;
        case 's':
          command = shift
            ? { type: 'jog', deltaX: 0, deltaY: 0, deltaZ: -JOG_STEP }
            : { type: 'jog', deltaX: 0, deltaY: -JOG_STEP, deltaZ: 0 };
          break;
        case 'a':
          command = { type: 'jog', deltaX: -JOG_STEP, deltaY: 0, deltaZ: 0 };
          break;
        case 'd':
          command = { type: 'jog', deltaX: JOG_STEP, deltaY: 0, deltaZ: 0 };
          break;
        case '[':
          command = { type: 'rotateJoint', joint: activeJoint, degrees: -stepDeg };
          break;
        case ']':
          command = { type: 'rotateJoint', joint: activeJoint, degrees: stepDeg };
          break;
        default:
          if (e.key >= '1' && e.key <= '7') {
            const idx = parseInt(e.key) - 1;
            if (idx < JOINT_NAMES.length) {
              setActiveJoint(idx);
            }
            return;
          }
          return;
      }

      e.preventDefault();
      lastEmit.current = now;

      if (command) {
        motionController.execute(command as any, 'keyboard');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeJoint, stepDeg]);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
        Keyboard
      </h2>

      <div className="space-y-1.5 rounded border border-gray-700 bg-gray-800/50 p-3 font-mono text-[11px]">
        {/* Jog section */}
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Jog
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex items-center gap-2">
              <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-[10px] text-gray-200">A</kbd>
              <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-[10px] text-gray-200">D</kbd>
              <span className="text-gray-400">X</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-[10px] text-gray-200">W</kbd>
              <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-[10px] text-gray-200">S</kbd>
              <span className="text-gray-400">Y</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="inline-flex items-center rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-[10px] text-gray-200">Shift</kbd>
              <span className="text-gray-500">+</span>
              <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-[10px] text-gray-200">W</kbd>
              <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-gray-600 bg-gray-700 px-1 py-0.5 text-[10px] text-gray-200">S</kbd>
              <span className="text-gray-400">Z</span>
            </div>
          </div>
        </div>

        {/* Joint adjust section */}
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Adjust Joint
          </div>
          <div className="space-y-1">
            {JOINT_NAMES.map((name, i) => (
              <div key={name} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveJoint(i)}
                  className={`shrink-0 rounded border px-1 py-0.5 text-[10px] transition-colors ${
                    i === activeJoint
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {toLabel(name)}
                </button>
                <button
                  onClick={() => emit({ type: 'rotateJoint', joint: i, degrees: -stepDeg })}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gray-700 text-[9px] text-gray-400 hover:bg-gray-600 hover:text-gray-200"
                >
                  −
                </button>
                <span className="w-0 flex-1 text-right text-[10px] tabular-nums text-gray-300">
                  {stepDeg}°
                </span>
                <button
                  onClick={() => emit({ type: 'rotateJoint', joint: i, degrees: stepDeg })}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gray-700 text-[9px] text-gray-400 hover:bg-gray-600 hover:text-gray-200"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Step size selector */}
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Step Size
          </div>
          <div className="flex rounded bg-gray-900/50 p-0.5">
            {[1, 2, 5, 10].map((val) => (
              <button
                key={val}
                onClick={() => setStepDeg(val)}
                className={`flex-1 rounded px-1 py-0.5 text-center text-[10px] font-medium transition-colors ${
                  stepDeg === val
                    ? 'bg-sky-500 text-white font-bold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {val}°
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="border-t border-gray-700/50 pt-2 text-[10px] text-gray-500">
          <span className="text-gray-400">[ / ]</span> rotate active joint &nbsp;
          <span className="text-gray-400">1-7</span> select joint
        </div>
      </div>
    </div>
  );
}
