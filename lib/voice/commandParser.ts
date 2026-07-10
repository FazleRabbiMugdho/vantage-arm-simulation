import type { MotionCommand } from '@/lib/motion/types';

export interface ParsedCommand {
  recognized: boolean;
  description: string;
  command: MotionCommand | null;
  commands?: MotionCommand[];
}

const JOINT_COUNT = 7;
const JOINT_NAMES = [
  'joint_1', 'joint_2', 'joint_3', 'joint_4',
  'joint_5', 'joint_6', 'stylus_pitch',
];

const JOG_STEP = 0.1;

const DIRECTION_MAP: Record<string, [number, number, number]> = {
  up:      [0, 0, JOG_STEP],
  down:    [0, 0, -JOG_STEP],
  left:    [0, -JOG_STEP, 0],
  right:   [0, JOG_STEP, 0],
  forward: [JOG_STEP, 0, 0],
  back:    [-JOG_STEP, 0, 0],
};

function parseSingleCommand(text: string): ParsedCommand {
  const lower = text.toLowerCase().trim();

  // --- Press key: "press key N", "press N", "hit key N", "go to key N", "type N" ---
  const pressMatch = lower.match(/^(?:press|hit|type|go\s*to)\s+(?:key\s*)?(\d)$/);
  if (pressMatch) {
    const keyNum = parseInt(pressMatch[1]);
    if (keyNum < 1 || keyNum > 6) {
      return {
        recognized: false,
        description: `Key ${keyNum} is out of range (1-6)`,
        command: null,
      };
    }
    return {
      recognized: true,
      description: `Press key ${keyNum}`,
      command: { type: 'pressKey', keyIndex: keyNum - 1 },
    };
  }

  // --- Move / jog: "move up", "go forward", "move left 10 cm" etc. ---
  const moveMatch = lower.match(
    /^(?:move|go)\s+(up|down|left|right|forward|back)(?:\s+(\d+(?:\.\d+)?)\s*(mm|cm|meters?|centimeters?))?\s*$/
  );
  if (moveMatch) {
    const dir = moveMatch[1];
    let step = JOG_STEP;
    if (moveMatch[2] && moveMatch[3]) {
      const val = parseFloat(moveMatch[2]);
      const unit = moveMatch[3];
      if (unit === 'mm') {
        step = val / 1000;
      } else if (unit.startsWith('c')) {
        step = val / 100;
      } else {
        step = val;
      }
    }
    const delta = DIRECTION_MAP[dir];
    const scale = step / JOG_STEP;
    return {
      recognized: true,
      description: `Jog ${dir}${moveMatch[2] ? ` ${moveMatch[2]}${moveMatch[3]}` : ''}`,
      command: {
        type: 'jog',
        deltaX: delta[0] * scale,
        deltaY: delta[1] * scale,
        deltaZ: delta[2] * scale,
      },
    };
  }

  // --- Rotate joint: "rotate joint 3 left 10 degrees", "rotate base right 5 degrees" ---
  const rotMatch = lower.match(
    /^rotate\s+(?:joint\s*)?(\d+|base)\s+(left|right)\s*(\d+)\s*degrees?\s*$/
  );
  if (rotMatch) {
    let jointIdx: number;
    if (rotMatch[1] === 'base') {
      jointIdx = 0;
    } else {
      jointIdx = parseInt(rotMatch[1]) - 1;
    }
    if (jointIdx < 0 || jointIdx >= JOINT_COUNT) {
      return {
        recognized: false,
        description: `Joint number out of range (1-${JOINT_COUNT})`,
        command: null,
      };
    }
    const direction = rotMatch[2];
    const degrees = parseInt(rotMatch[3]);
    const signedDegrees = direction === 'left' ? degrees : -degrees;
    return {
      recognized: true,
      description: `Rotate ${JOINT_NAMES[jointIdx]} ${direction} ${degrees}°`,
      command: { type: 'rotateJoint', joint: jointIdx, degrees: signedDegrees },
    };
  }

  // --- Not recognized ---
  return {
    recognized: false,
    description: 'Command not recognized',
    command: null,
  };
}

export function parseCommand(text: string): ParsedCommand {
  const clean = text.trim();
  if (!clean) {
    return { recognized: false, description: 'Empty command', command: null };
  }

  // Split by conjunctions: "and then", "then", "and", or comma
  const parts = clean.split(/\s+(?:and\s+then|then|and)\s+|,\s*/i);

  if (parts.length > 1) {
    const parsedParts: ParsedCommand[] = [];
    let allRecognized = true;

    for (const part of parts) {
      if (!part.trim()) continue;
      const parsed = parseSingleCommand(part.trim());
      if (!parsed.recognized) {
        allRecognized = false;
        break;
      }
      parsedParts.push(parsed);
    }

    if (allRecognized && parsedParts.length > 0) {
      const commands = parsedParts.map((p) => p.command).filter((c): c is MotionCommand => c !== null);
      const descriptions = parsedParts.map((p) => p.description).join(' ➔ ');
      return {
        recognized: true,
        description: descriptions,
        command: commands[0],
        commands,
      };
    }
  }

  return parseSingleCommand(clean);
}
