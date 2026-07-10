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

const AgenticControl = dynamic(
  () => import('@/components/controls/AgenticControl'),
  { ssr: false }
);

const ActiveSourceBadge = dynamic(
  () => import('@/components/dashboard/ActiveSourceBadge'),
  { ssr: false }
);

const ActivityLogPanel = dynamic(
  () => import('@/components/dashboard/ActivityLogPanel'),
  { ssr: false }
);

function CollapseBtn({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded text-gray-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
    >
      <svg
        className={`h-3 w-3 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
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
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/40 bg-graphite-800 px-6 py-2.5">
        <div className="flex items-center gap-3">
          {/* Amber accent bar */}
          <div className="h-5 w-1 rounded-full bg-amber-500" />
          <h1 className="text-lg font-semibold tracking-tight text-gray-100">
            Vantage Arm Simulation
          </h1>
          <span className="hidden text-[10px] font-medium uppercase tracking-widest text-gray-600 sm:inline">
            Control Dashboard
          </span>
        </div>
        <ActiveSourceBadge />
      </header>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* 3D Viewer — visually dominant */}
        <div className="relative min-w-0 flex-1">
          <RobotViewer />
        </div>

        {/* Controls panel */}
        <aside
          className={`flex flex-col border-l border-gray-700/30 bg-graphite-800 transition-all duration-200 ${
            controlsOpen
              ? 'w-[280px] overflow-y-auto overscroll-contain'
              : 'w-8 overflow-hidden'
          }`}
        >
          <div className={`flex items-center justify-between border-b border-gray-700/30 ${controlsOpen ? 'px-4' : 'px-1.5'} py-2`}>
            {controlsOpen && (
              <span className="panel-heading">
                Controls
              </span>
            )}
            <CollapseBtn collapsed={!controlsOpen} onClick={() => setControlsOpen(!controlsOpen)} />
          </div>
          {controlsOpen && (
            <div className="flex flex-col gap-0">
              <div className="border-b border-gray-700/30 p-4">
                <PinEntryControl />
              </div>
              <div className="border-b border-gray-700/30 p-4">
                <VoiceControl />
              </div>
              <div className="border-b border-gray-700/30 p-4">
                <AgenticControl />
              </div>
              <div className="p-4">
                <KeyboardControl />
              </div>
            </div>
          )}
        </aside>

        {/* Telemetry panel */}
        <aside
          className={`flex flex-col border-l border-gray-700/30 bg-graphite-800 transition-all duration-200 ${
            telemetryOpen
              ? 'w-[280px] overflow-y-auto overscroll-contain'
              : 'w-8 overflow-hidden'
          }`}
        >
          <div className={`flex items-center justify-between border-b border-gray-700/30 ${telemetryOpen ? 'px-4' : 'px-1.5'} py-2`}>
            {telemetryOpen && (
              <span className="panel-heading">
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
              <div className="border-t border-gray-700/30 p-4">
                <JoystickControl />
              </div>
              <div className="border-t border-gray-700/30 p-4">
                <ActivityLogPanel />
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
