'use client';

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

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-6 py-3">
        <h1 className="text-xl font-semibold">Vantage Arm Simulation</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <RobotViewer />
        </div>
        <aside className="flex w-72 flex-shrink-0 flex-col border-l border-gray-700 bg-gray-800">
          <div className="flex-1 overflow-y-auto">
            <TelemetryPanel />
          </div>
          <div className="border-t border-gray-700 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Joystick
            </h2>
            <JoystickControl />
          </div>
          <div className="border-t border-gray-700 p-4">
            <KeyboardControl />
          </div>
        </aside>
      </div>
    </main>
  );
}
