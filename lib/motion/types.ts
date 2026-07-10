export type MotionCommand =
  | { type: 'jog'; deltaX: number; deltaY: number; deltaZ: number }
  | { type: 'moveTo'; target: [number, number, number] }
  | { type: 'rotateJoint'; joint: number; degrees: number }
  | { type: 'pressKey'; keyIndex: number };

export type AdapterName =
  | 'joystick'
  | 'keyboard'
  | 'voice'
  | 'autonomous'
  | 'agentic';

export interface CommandResult {
  accepted: boolean;
  reason?: string;
  newAngles?: number[];
}

export interface LogEntry {
  timestamp: number;
  source: AdapterName;
  command: MotionCommand;
  result: CommandResult;
}
