'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const RobotViewer = dynamic(
  () => import('@/components/viewer/RobotViewer'),
  { ssr: false }
);

const TelemetryPanel = dynamic(
  () => import('@/components/dashboard/TelemetryPanel'),
  { ssr: false }
);

const JoystickControl = dynamic(
  () => import('@/components/controls/JoystickControl'),
  { ssr: false }
);

const KeyboardControl = dynamic(
  () => import('@/components/controls/KeyboardControl'),
  { ssr: false }
);

const PinEntryControl = dynamic(
  () => import('@/components/controls/PinEntryControl'),
  { ssr: false }
);

const VoiceControl = dynamic(
  () => import('@/components/controls/VoiceControl'),
  { ssr: false }
);

function CollapseBtn({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-700 hover:text-gray-200"
    >
      <svg
        className={`h-3 w-3 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        viewBox="0 0 10 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M1 5l4-4 4 4" />
      </svg>
    </button>
  );
}

export default function Home() {
  const [controlsOpen, setControlsOpen] = useState(true);
  const [telemetryOpen, setTelemetryOpen] = useState(true);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-6 py-3">
        <h1 className="text-xl font-semibold">Vantage Arm Simulation</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1">
          <RobotViewer />
        </div>

        {/* Controls panel */}
        <aside
          className={`flex flex-col border-l border-gray-700 bg-gray-800 transition-all duration-200 ${
            controlsOpen
              ? 'w-72 overflow-y-auto overscroll-contain'
              : 'w-8 overflow-hidden'
          }`}
        >
          <div className={`flex items-center justify-between border-b border-gray-700 ${controlsOpen ? 'px-4' : 'px-1.5'} py-2`}>
            {controlsOpen && (
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Controls
              </span>
            )}
            <CollapseBtn collapsed={!controlsOpen} onClick={() => setControlsOpen(!controlsOpen)} />
          </div>
          {controlsOpen && (
            <div className="flex flex-col gap-0">
              <div className="border-b border-gray-700 p-4">
                <PinEntryControl />
              </div>
              <div className="border-b border-gray-700 p-4">
                <VoiceControl />
              </div>
              <div className="p-4">
                <KeyboardControl />
              </div>
            </div>
          )}
        </aside>

        {/* Telemetry panel */}
        <aside
          className={`flex flex-col border-l border-gray-700 bg-gray-800 transition-all duration-200 ${
            telemetryOpen
              ? 'w-72 overflow-y-auto overscroll-contain'
              : 'w-8 overflow-hidden'
          }`}
        >
          <div className={`flex items-center justify-between border-b border-gray-700 ${telemetryOpen ? 'px-4' : 'px-1.5'} py-2`}>
            {telemetryOpen && (
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Telemetry
              </span>
            )}
            <CollapseBtn collapsed={!telemetryOpen} onClick={() => setTelemetryOpen(!telemetryOpen)} />
          </div>
          {telemetryOpen && (
            <div className="flex flex-col gap-0">
              <div className="p-4">
                <TelemetryPanel />
              </div>
              <div className="border-t border-gray-700 p-4">
                <JoystickControl />
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
