'use client';

import dynamic from 'next/dynamic';

const RobotViewer = dynamic(
  () => import('@/components/viewer/RobotViewer'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-gray-700 bg-gray-800 px-6 py-3">
        <h1 className="text-xl font-semibold">Vantage Arm Simulation</h1>
      </header>
      <div className="flex-1">
        <RobotViewer />
      </div>
    </main>
  );
}
