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

// SVG Icons for professional styling
const TargetIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

const KeyboardIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
  </svg>
);

const PinIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M12 7h.01M17 7h.01M7 12h.01M12 12h.01M17 12h.01M7 17h.01M12 17h.01M17 17h.01" />
  </svg>
);

const MicIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const SparksIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-1.813-5.096L2.091 14.09 7.188 13.27 9.813 8.18l1.812 5.09 5.097.82-5.097.814zm6.937-8.718L16 11l-.75-2.814-2.813-.75 2.813-.75L16 3.872l.75 2.814 2.813.75-2.813.75z" />
  </svg>
);

const TelemetryIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
  </svg>
);

const LogIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h10M7 16h6" />
  </svg>
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
    <main className="flex h-screen flex-col overflow-hidden bg-graphite-900">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-700/40 bg-graphite-800 px-6 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Amber accent bar */}
          <div className="h-5 w-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
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
        <div className="relative min-w-0 flex-1 bg-graphite-950">
          <RobotViewer />

          {/* Overlay Floating Joystick at the Left Bottom side */}
          <div
            className={`absolute bottom-6 left-6 z-10 w-[260px] rounded-xl border bg-graphite-800/90 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 ${
              activeSource === 'joystick'
                ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'border-graphite-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-graphite-700/40">
              <span className="text-amber-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v5M10 20h4" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="text-[10px] font-semibold text-gray-200 tracking-wide uppercase">
                Joystick Control
              </span>
            </div>
            <JoystickControl />
          </div>
        </div>

        {/* Collapsible Feature Cards Panel */}
        <aside className="w-[320px] flex-shrink-0 border-l border-gray-700/20 bg-graphite-800 flex flex-col min-h-0 shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
            {/* 1. Target Position */}
            <CollapsibleFeatureCard
              id="target-position"
              icon={<TargetIcon />}
              title="Target Position"
              description="Type exact coordinates and send the arm straight there."
              defaultOpen={false}
              isActive={activeSource === 'target-position'}
              actionTrigger={lastEntry?.timestamp}
            >
              <TargetBoxControl />
            </CollapsibleFeatureCard>

            {/* 2. Keyboard */}
            <CollapsibleFeatureCard
              id="keyboard"
              icon={<KeyboardIcon />}
              title="Keyboard"
              description="Use keys and shortcuts to jog the arm."
              defaultOpen={false}
              isActive={activeSource === 'keyboard'}
              actionTrigger={lastEntry?.timestamp}
            >
              <KeyboardControl />
            </CollapsibleFeatureCard>

            {/* 3. PIN Sequence */}
            <CollapsibleFeatureCard
              id="pin-sequence"
              icon={<PinIcon />}
              title="PIN Sequence"
              description="Enter a 6-digit code and watch the arm type it automatically."
              defaultOpen={false}
              isActive={activeSource === 'pin-sequence'}
              actionTrigger={lastEntry?.timestamp}
            >
              <PinEntryControl />
            </CollapsibleFeatureCard>

            {/* 4. Voice Control */}
            <CollapsibleFeatureCard
              id="voice-control"
              icon={<MicIcon />}
              title="Voice Control"
              description="Speak simple commands like 'move up' or 'press key 3'."
              defaultOpen={false}
              isActive={activeSource === 'voice'}
              actionTrigger={lastEntry?.timestamp}
            >
              <VoiceControl />
            </CollapsibleFeatureCard>

            {/* 5. Agentic AI */}
            <CollapsibleFeatureCard
              id="agentic-ai"
              icon={<SparksIcon />}
              title="Agentic AI"
              description="Describe what you want in your own words."
              defaultOpen={false}
              isActive={activeSource === 'agentic'}
              actionTrigger={lastEntry?.timestamp}
            >
              <AgenticControl />
            </CollapsibleFeatureCard>

            {/* 6. Joint & Position Details */}
            <CollapsibleFeatureCard
              id="telemetry-details"
              icon={<TelemetryIcon />}
              title="Joint & Position Details"
              description="Full breakdown of every joint angle and the exact tip position."
              defaultOpen={false}
            >
              <TelemetryPanel />
            </CollapsibleFeatureCard>

            {/* 7. Activity Log */}
            <CollapsibleFeatureCard
              id="activity-log"
              icon={<LogIcon />}
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
