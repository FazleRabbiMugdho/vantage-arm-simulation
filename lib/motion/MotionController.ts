import type { MotionCommand, AdapterName, CommandResult, LogEntry } from './types';
import { AnimationController } from './animation';
import { useJointStore } from '@/lib/store/jointState';
import { KINEMATIC_CHAIN, IK_JOINT_NAMES } from '@/lib/ik/chain';
import { solveIK } from '@/lib/ik/solver';
import { JOINT_LIMITS } from '@/lib/config/jointLimits';
import { KEY_POSITIONS } from '@/lib/config/keyConfig';

export class MotionController {
  private anim = new AnimationController();
  private pendingAngleUpdate: number[] | null = null;

  execute(command: MotionCommand, source: AdapterName): CommandResult {
    const result = this.resolveAndValidate(command);

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      source,
      command,
      result,
    };

    const store = useJointStore.getState();
    store.addLogEntry(logEntry);

    if (result.accepted && result.newAngles) {
      this.animateTo(result.newAngles);
    }

    return result;
  }

  stopAnimation() {
    this.anim.stop();
    this.pendingAngleUpdate = null;
  }

  isAnimating(): boolean {
    return this.anim.isRunning();
  }

  private animateTo(targetAngles: number[]) {
    const current = useJointStore.getState().jointAngles;
    this.anim.start(
      current,
      targetAngles,
      (angles) => {
        this.pendingAngleUpdate = angles;
        useJointStore.getState().setJointAngles(angles);
      },
      () => {
        this.pendingAngleUpdate = null;
      },
      200,
    );
  }

  private resolveAndValidate(command: MotionCommand): CommandResult {
    const store = useJointStore.getState();
    const currentAngles = store.jointAngles;

    switch (command.type) {
      case 'rotateJoint': {
        return this.handleRotateJoint(command, currentAngles);
      }
      case 'jog': {
        return this.handleJog(command, currentAngles);
      }
      case 'moveTo': {
        return this.handleMoveTo(command, currentAngles);
      }
      case 'pressKey': {
        return this.handlePressKey(command, currentAngles);
      }
      default:
        return {
          accepted: false,
          reason: 'Unknown command type',
        };
    }
  }

  private handleRotateJoint(
    cmd: { joint: number; degrees: number },
    currentAngles: number[],
  ): CommandResult {
    const jointIdx = cmd.joint;
    if (jointIdx < 0 || jointIdx >= IK_JOINT_NAMES.length) {
      return {
        accepted: false,
        reason: `Joint index ${jointIdx} is invalid — must be 0-${IK_JOINT_NAMES.length - 1}`,
      };
    }

    const jointName = IK_JOINT_NAMES[jointIdx];
    const limit = JOINT_LIMITS[jointName];
    const deltaRad = cmd.degrees * (Math.PI / 180);
    const newAngle = currentAngles[jointIdx] + deltaRad;

    if (isNaN(newAngle) || !isFinite(newAngle)) {
      return {
        accepted: false,
        reason: `Angle is not a number — ignoring command`,
      };
    }

    if (newAngle < limit.lower || newAngle > limit.upper) {
      return {
        accepted: false,
        reason: `${jointName} would rotate past its safe limit (${limit.lowerDeg}° to ${limit.upperDeg}°)`,
      };
    }

    const newAngles = [...currentAngles];
    newAngles[jointIdx] = newAngle;

    return { accepted: true, newAngles };
  }

  private handleJog(
    cmd: { deltaX: number; deltaY: number; deltaZ: number },
    currentAngles: number[],
  ): CommandResult {
    const currentPos = useJointStore.getState().eePosition;

    const target: [number, number, number] = [
      currentPos[0] + cmd.deltaX,
      currentPos[1] + cmd.deltaY,
      currentPos[2] + cmd.deltaZ,
    ];

    if (target.some((v) => isNaN(v) || !isFinite(v))) {
      return {
        accepted: false,
        reason: 'Invalid jog target — position is not a number',
      };
    }

    return this.solveAndValidate(target, currentAngles);
  }

  private handleMoveTo(
    cmd: { target: [number, number, number] },
    currentAngles: number[],
  ): CommandResult {
    if (cmd.target.some((v) => isNaN(v) || !isFinite(v))) {
      return {
        accepted: false,
        reason: 'Target position contains invalid values',
      };
    }
    return this.solveAndValidate(cmd.target, currentAngles);
  }

  private handlePressKey(
    cmd: { keyIndex: number },
    currentAngles: number[],
  ): CommandResult {
    if (cmd.keyIndex < 0 || cmd.keyIndex >= KEY_POSITIONS.length) {
      return {
        accepted: false,
        reason: `Key index ${cmd.keyIndex} is invalid — must be 0-5`,
      };
    }

    const key = KEY_POSITIONS[cmd.keyIndex];
    const target: [number, number, number] = [key.x, key.y, key.z];
    return this.solveAndValidate(target, currentAngles);
  }

  private solveAndValidate(
    target: [number, number, number],
    currentAngles: number[],
  ): CommandResult {
    const result = solveIK(currentAngles, target, KINEMATIC_CHAIN, {
      tolerance: 0.002,
      maxIterations: 100,
      lambda: 0.1,
    });

    if (!result.converged) {
      return {
        accepted: false,
        reason: `Target position is too far — the arm cannot reach that point`,
      };
    }

    if (result.angles.some((a) => isNaN(a) || !isFinite(a))) {
      return {
        accepted: false,
        reason: 'IK solver returned invalid angles',
      };
    }

    for (let i = 0; i < result.angles.length; i++) {
      const limit = KINEMATIC_CHAIN.limits[i];
      if (result.angles[i] < limit.lower - 1e-9 || result.angles[i] > limit.upper + 1e-9) {
        const jointName = IK_JOINT_NAMES[i];
        return {
          accepted: false,
          reason: `${jointName} would exceed its safe limit`,
        };
      }
    }

    return { accepted: true, newAngles: result.angles };
  }
}

export const motionController = new MotionController();
