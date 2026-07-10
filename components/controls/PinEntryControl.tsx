'use client';

import { useState, useCallback, useRef } from 'react';
import { motionController } from '@/lib/motion/MotionController';
import { KEY_POSITIONS, APPROACH_OFFSET } from '@/lib/config/keyConfig';
import { useJointStore } from '@/lib/store/jointState';

type Phase = 'approach' | 'descend' | 'retract';
type StepStatus = 'running' | 'accepted' | 'rejected';

interface StepRecord {
  digitIndex: number;
  phase: Phase;
  status: StepStatus;
  reason?: string;
}

function phaseLabel(p: Phase): string {
  switch (p) {
    case 'approach': return 'Approach';
    case 'descend': return 'Descend';
    case 'retract': return 'Retract';
  }
}

function phaseColor(p: Phase): string {
  switch (p) {
    case 'approach': return 'text-amber-400';
    case 'descend': return 'text-green-400';
    case 'retract': return 'text-amber-500';
  }
}

export default function PinEntryControl() {
  const [pin, setPin] = useState('555555');
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<{ digit: number; phase: Phase } | null>(null);
  const [log, setLog] = useState<StepRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const abortRef = useRef(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^1-6]/g, '').slice(0, 6);
    setPin(val);
    setError(null);
  };

  const addStep = useCallback((s: StepRecord) => {
    setLog((prev) => [...prev, s]);
  }, []);

  const runSequence = useCallback(async () => {
    if (pin.length !== 6) { setError('PIN must be exactly 6 digits'); return; }
    if (!/^[1-6]+$/.test(pin)) { setError('Each digit must be 1-6'); return; }
    if (running) return;

    abortRef.current = false;
    setRunning(true);
    setLog([]);
    setCurrentStep(null);
    setRejectionReason(null);
    setError(null);

    const digits = pin.split('').map(Number);
    console.log('[PinEntryControl] Starting PIN sequence for digits:', digits);

    for (let i = 0; i < digits.length; i++) {
      if (abortRef.current) {
        console.log('[PinEntryControl] Sequence aborted at digit index', i);
        break;
      }

      const keyIdx = digits[i] - 1;
      const key = KEY_POSITIONS[keyIdx];
      if (!key) {
        console.error('[PinEntryControl] Key not found at index', keyIdx);
        setError(`Key index ${keyIdx + 1} not found in config`);
        break;
      }

      console.log(`[PinEntryControl] Processing digit ${i + 1}/6: key ${digits[i]} at [x:${key.x}, y:${key.y}, z:${key.z}]`);

      // Approach
      const approachPos: [number, number, number] = [key.x, key.y, key.z + APPROACH_OFFSET];
      setCurrentStep({ digit: i + 1, phase: 'approach' });
      console.log('[PinEntryControl] Sending moveTo approachPos:', approachPos);
      let result = motionController.execute(
        { type: 'moveTo', target: approachPos },
        'autonomous',
        `Approach PIN ${digits[i]} at (${key.x.toFixed(3)}, ${key.y.toFixed(3)}, ${key.z.toFixed(3)})`,
      );
      console.log('[PinEntryControl] Approach result:', result);
      addStep({ digitIndex: i + 1, phase: 'approach', status: result.accepted ? 'accepted' : 'rejected', reason: result.reason });
      if (!result.accepted) {
        setRejectionReason(result.reason ?? 'Approach failed');
        console.error('[PinEntryControl] Approach rejected. Reason:', result.reason);
        break;
      }
      await motionController.waitUntilIdle();
      if (abortRef.current) break;

      // Descend
      const descendPos: [number, number, number] = [key.x, key.y, key.z];
      setCurrentStep({ digit: i + 1, phase: 'descend' });
      console.log('[PinEntryControl] Sending moveTo descendPos:', descendPos);
      result = motionController.execute(
        { type: 'moveTo', target: descendPos },
        'autonomous',
        `Descend to PIN ${digits[i]} at (${key.x.toFixed(3)}, ${key.y.toFixed(3)}, ${key.z.toFixed(3)})`,
      );
      console.log('[PinEntryControl] Descend result:', result);
      addStep({ digitIndex: i + 1, phase: 'descend', status: result.accepted ? 'accepted' : 'rejected', reason: result.reason });
      if (!result.accepted) {
        setRejectionReason(result.reason ?? 'Descend failed');
        console.error('[PinEntryControl] Descend rejected. Reason:', result.reason);
        break;
      }
      useJointStore.getState().setActiveKey(keyIdx);
      await motionController.waitUntilIdle();
      if (abortRef.current) break;

      // Dwell 0.7s at descend (EE stays on key, button stays green)
      await new Promise((r) => setTimeout(r, 700));
      if (abortRef.current) break;

      // Retract
      useJointStore.getState().setActiveKey(null);
      setCurrentStep({ digit: i + 1, phase: 'retract' });
      console.log('[PinEntryControl] Sending moveTo retractPos (same as approach):', approachPos);
      result = motionController.execute(
        { type: 'moveTo', target: approachPos },
        'autonomous',
        `Retract from PIN ${digits[i]}`,
      );
      console.log('[PinEntryControl] Retract result:', result);
      addStep({ digitIndex: i + 1, phase: 'retract', status: result.accepted ? 'accepted' : 'rejected', reason: result.reason });
      if (!result.accepted) {
        setRejectionReason(result.reason ?? 'Retract failed');
        console.error('[PinEntryControl] Retract rejected. Reason:', result.reason);
        break;
      }
      await motionController.waitUntilIdle();
    }

    console.log('[PinEntryControl] PIN sequence execution completed');
    useJointStore.getState().setActiveKey(null);
    setCurrentStep(null);
    setRunning(false);
  }, [pin, running, addStep]);

  const stopSequence = useCallback(() => {
    abortRef.current = true;
    motionController.stopAnimation();
    useJointStore.getState().setActiveKey(null);
    setCurrentStep(null);
    setRunning(false);
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="panel-heading">
        PIN Entry
      </h2>

      {/* Input + buttons */}
      <div className="space-y-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={handleInput}
          disabled={running}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="e.g. 123456"
          className="w-full rounded border border-gray-700/50 bg-graphite-900 px-3 py-2 text-center font-mono text-lg tracking-[0.5em] text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-40"
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Run / Stop */}
      <div className="flex gap-2">
        <button
          onClick={runSequence}
          disabled={running}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-semibold transition-all ${
            running
              ? 'animate-pulse bg-amber-600 text-white'
              : 'bg-amber-500 text-graphite-950 hover:bg-amber-400 disabled:opacity-40'
          }`}
        >
          {running ? 'Running…' : 'Run Sequence'}
        </button>
        <button
          onClick={stopSequence}
          disabled={!running}
          className="rounded bg-red-600/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-30"
        >
          Stop
        </button>
      </div>

      {/* Live step indicator */}
      {currentStep && (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2">
          <p className="text-xs text-gray-400">
            Digit <span className="font-mono font-semibold text-amber-400">{currentStep.digit}</span> of 6
          </p>
          <p className={`text-sm font-semibold ${phaseColor(currentStep.phase)}`}>
            {phaseLabel(currentStep.phase)}
          </p>
        </div>
      )}

      {/* Rejection reason */}
      {rejectionReason && (
        <div className="rounded border border-l-2 border-red-500/30 border-l-red-500 bg-red-500/5 p-2">
          <p className="text-xs font-semibold text-red-400">Sequence stopped</p>
          <p className="text-xs text-red-400/70">{rejectionReason}</p>
        </div>
      )}

      {/* Step log */}
      {log.length > 0 && (
        <div className="max-h-40 space-y-0.5 overflow-y-auto overscroll-contain rounded border border-gray-700/30 bg-graphite-900/50 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Step Log</p>
          {log.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-4 text-right font-mono text-gray-600">{s.digitIndex}</span>
              <span className={`w-16 ${phaseColor(s.phase)}`}>{phaseLabel(s.phase)}</span>
              <span className={s.status === 'accepted' ? 'text-green-400' : 'text-red-400'}>
                {s.status === 'accepted' ? '✓' : '✗'}
              </span>
              {s.reason && <span className="text-gray-500 truncate">{s.reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
