'use client';

import dynamic from 'next/dynamic';
import { useJointStore } from '@/lib/store/jointState';
import CollapsibleFeatureCard from '@/components/dashboard/CollapsibleFeatureCard';
import LiveStatusStrip from '@/components/dashboard/LiveStatusStrip';

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

const TargetBoxControl = dynamic(
  () => import('@/components/controls/TargetBoxControl'),
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

export default function Home() {
  const activityLog = useJointStore((s) => s.activityLog);
  const lastEntry = activityLog.length > 0 ? activityLog[activityLog.length - 1] : null;
  const logCount = activityLog.length;

  let activeSource = '';
  if (lastEntry) {
    if (lastEntry.source === 'autonomous') {
      if (lastEntry.command.type === 'moveTo') {
        activeSource = 'target-position';
      } else {
        activeSource = 'pin-sequence';
      }
    } else {
      activeSource = lastEntry.source;
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/40 bg-graphite-800 px-6 py-2.5">
        <div className="flex items-center gap-3">
          {/* Amber accent bar */}
          <div className="h-5 w-1 rounded-full bg-amber-500" />
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-tight text-gray-100 uppercase">
              Vantage Arm Simulation
            </h1>
            <span className="text-[9px] font-medium text-gray-500 tracking-wider">
              Control the simulated arm using any method below — they all drive the same arm.
            </span>
          </div>
        </div>
        <ActiveSourceBadge />
      </header>

      {/* Live Status Strip */}
      <LiveStatusStrip />

      {/* Main content split */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 3D Viewer — occupies remaining space, highly dominant */}
        <div className="relative min-w-0 flex-1">
          <RobotViewer />
        </div>

        {/* Collapsible Feature Cards Panel */}
        <aside className="w-[320px] flex-shrink-0 border-l border-gray-700/20 bg-graphite-800 flex flex-col min-h-0 shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
            {/* 1. Target Position */}
            <CollapsibleFeatureCard
              id="target-position"
              icon="🎯"
              title="Target Position"
              description="Type exact coordinates and send the arm straight there."
              defaultOpen={true}
              isActive={activeSource === 'target-position'}
              actionTrigger={lastEntry?.timestamp}
            >
              <TargetBoxControl />
            </CollapsibleFeatureCard>

            {/* 2. Joystick */}
            <CollapsibleFeatureCard
              id="joystick"
              icon="🕹️"
              title="Joystick"
              description="Drag to move the tip freely in real time."
              defaultOpen={true}
              isActive={activeSource === 'joystick'}
              actionTrigger={lastEntry?.timestamp}
            >
              <JoystickControl />
            </CollapsibleFeatureCard>

            {/* 3. Keyboard */}
            <CollapsibleFeatureCard
              id="keyboard"
              icon="⌨️"
              title="Keyboard"
              description="Use keys and shortcuts to jog the arm."
              defaultOpen={false}
              isActive={activeSource === 'keyboard'}
              actionTrigger={lastEntry?.timestamp}
            >
              <KeyboardControl />
            </CollapsibleFeatureCard>

            {/* 4. PIN Sequence */}
            <CollapsibleFeatureCard
              id="pin-sequence"
              icon="🔢"
              title="PIN Sequence"
              description="Enter a 6-digit code and watch the arm type it automatically."
              defaultOpen={false}
              isActive={activeSource === 'pin-sequence'}
              actionTrigger={lastEntry?.timestamp}
            >
              <PinEntryControl />
            </CollapsibleFeatureCard>

            {/* 5. Voice Control */}
            <CollapsibleFeatureCard
              id="voice-control"
              icon="🎙️"
              title="Voice Control"
              description="Speak simple commands like 'move up' or 'press key 3'."
              defaultOpen={false}
              isActive={activeSource === 'voice'}
              actionTrigger={lastEntry?.timestamp}
            >
              <VoiceControl />
            </CollapsibleFeatureCard>

            {/* 6. Agentic AI */}
            <CollapsibleFeatureCard
              id="agentic-ai"
              icon="🤖"
              title="Agentic AI"
              description="Describe what you want in your own words."
              defaultOpen={false}
              isActive={activeSource === 'agentic'}
              actionTrigger={lastEntry?.timestamp}
            >
              <AgenticControl />
            </CollapsibleFeatureCard>

            {/* 7. Joint & Position Details */}
            <CollapsibleFeatureCard
              id="telemetry-details"
              icon="📊"
              title="Joint & Position Details"
              description="Full breakdown of every joint angle and the exact tip position."
              defaultOpen={false}
            >
              <TelemetryPanel />
            </CollapsibleFeatureCard>

            {/* 8. Activity Log */}
            <CollapsibleFeatureCard
              id="activity-log"
              icon="📜"
              title={`Activity Log (${logCount})`}
              description="History of every command sent, from any control."
              defaultOpen={false}
            >
              <ActivityLogPanel />
            </CollapsibleFeatureCard>
          </div>
        </aside>
      </div>
    </main>
  );
}
