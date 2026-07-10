'use client';

import { useRef } from 'react';
import { useJointStore } from '@/lib/store/jointState';
import { JOINT_LIMITS, JOINT_NAMES, WARNING_THRESHOLD_DEG } from '@/lib/config/jointLimits';

function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

function limitWarningLevel(jointName: string, angleRad: number): 'safe' | 'warn' | 'critical' {
  const limit = JOINT_LIMITS[jointName];
  if (!limit) return 'safe';
  const deg = radToDeg(angleRad);
  const distLower = Math.abs(deg - limit.lowerDeg);
  const distUpper = Math.abs(deg - limit.upperDeg);
  const minDist = Math.min(distLower, distUpper);
  if (minDist <= WARNING_THRESHOLD_DEG) return 'critical';
  if (minDist <= WARNING_THRESHOLD_DEG * 2) return 'warn';
  return 'safe';
}

function limitDotColor(level: 'safe' | 'warn' | 'critical'): string {
  switch (level) {
    case 'critical': return 'bg-red-500';
    case 'warn': return 'bg-yellow-500';
    case 'safe': return 'bg-green-500';
  }
}

const STEP_DEG = 1;
const STEP_RAD = STEP_DEG * (Math.PI / 180);

function HoldButton({ label, onStep, className }: {
  label: string;
  onStep: () => void;
  className?: string;
}) {
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  return (
    <button
      onPointerDown={() => {
        onStepRef.current();
        if (intervalRef.current !== null) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => onStepRef.current(), 100);
      }}
      onPointerUp={() => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }}
      onPointerLeave={() => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }}
      className={className}
    >
      {label}
    </button>
  );
}

export default function TelemetryPanel() {
  const jointAngles = useJointStore((s) => s.jointAngles);
  const setJointAngles = useJointStore((s) => s.setJointAngles);
  const eePosition = useJointStore((s) => s.eePosition);

  function adjustJoint(index: number, deltaRad: number) {
    const name = JOINT_NAMES[index];
    const limit = JOINT_LIMITS[name];
    const newVal = jointAngles[index] + deltaRad;
    const clamped = Math.max(limit.lower, Math.min(limit.upper, newVal));
    const updated = [...jointAngles];
    updated[index] = clamped;
    setJointAngles(updated);
  }

  return (
    <div className="space-y-4">

      {/* Joint angles */}
      <section className="mb-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Joint Angles
        </h3>
        <div className="space-y-1.5">
          {JOINT_NAMES.map((name, i) => {
            const angleRad = jointAngles[i] ?? 0;
            const angleDeg = radToDeg(angleRad);
            const level = limitWarningLevel(name, angleRad);
            const limit = JOINT_LIMITS[name];
            return (
              <div key={name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${limitDotColor(level)}`} />
                  <span className="font-mono text-xs text-gray-300">
                    {name.replace('joint_', 'J').replace('stylus_pitch', 'SP')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HoldButton
                    onStep={() => adjustJoint(i, -STEP_RAD)}
                    label="−"
                    className="flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600"
                  />
                  <span className="font-mono tabular-nums text-gray-100">
                    {angleDeg.toFixed(1)}°
                  </span>
                  <HoldButton
                    onStep={() => adjustJoint(i, STEP_RAD)}
                    label="+"
                    className="flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600"
                  />
                  <span className="text-[10px] text-gray-500">
                    [{limit.lowerDeg}..{limit.upperDeg}]
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* End-effector position */}
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          End-Effector Position
        </h3>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">X</span>
            <span className="font-mono tabular-nums text-gray-100">
              {eePosition[0].toFixed(3)} m
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Y</span>
            <span className="font-mono tabular-nums text-gray-100">
              {eePosition[1].toFixed(3)} m
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Z</span>
            <span className="font-mono tabular-nums text-gray-100">
              {eePosition[2].toFixed(3)} m
            </span>
          </div>
        </div>
      </section>

      {/* Warning legend */}
      <section className="mt-auto pt-4">
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Safe
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Near limit
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Within 5°
          </span>
        </div>
      </section>
    </div>
  );
}
