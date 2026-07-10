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
  private _resolveIdle: (() => void) | null = null;

  execute(command: MotionCommand, source: AdapterName, description?: string): CommandResult {
    const result = this.resolveAndValidate(command);

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      source,
      command,
      result,
      description,
    };

    const store = useJointStore.getState();
    store.addLogEntry(logEntry);

    if (result.accepted && result.newAngles) {
      let duration = 200;
      if (command.type === 'moveTo' || command.type === 'pressKey') {
        duration = 500;
      }
      this.animateTo(result.newAngles, duration);
    }

    return result;
  }

  async waitUntilIdle(): Promise<void> {
    if (!this.anim.isRunning()) return;
    return new Promise((resolve) => {
      this._resolveIdle = resolve;
    });
  }

  stopAnimation() {
    this.anim.stop();
    this.pendingAngleUpdate = null;
    this._resolveIdle?.();
    this._resolveIdle = null;
  }

  isAnimating(): boolean {
    return this.anim.isRunning();
  }

  private animateTo(targetAngles: number[], duration = 200) {
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
        this._resolveIdle?.();
        this._resolveIdle = null;
      },
      duration,
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
    // Use approach direction for moveTo — stylus should point downward (-Z in URDF frame)
    return this.solveAndValidate(cmd.target, currentAngles, [0, 0, -1]);
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
    return this.solveAndValidate(target, currentAngles, [0, 0, -1]);
  }

  private solveAndValidate(
    target: [number, number, number],
    currentAngles: number[],
    approachDirection?: [number, number, number],
  ): CommandResult {
    const ikOptions = {
      tolerance: 0.002,
      maxIterations: 150,
      lambda: 0.1,
      approachDirection,
      orientationWeight: 0.3,
    };

    let result = solveIK(currentAngles, target, KINEMATIC_CHAIN, ikOptions);

    // Fallback: If it did not converge starting from the current angles
    // (which can happen when starting from a bent HOME_POSE due to local minima/joint limits),
    // try solving starting from a neutral zero-angles configuration.
    if (!result.converged) {
      const zeroAngles = new Array(currentAngles.length).fill(0);
      const fallbackResult = solveIK(zeroAngles, target, KINEMATIC_CHAIN, ikOptions);
      if (fallbackResult.converged) {
        result = fallbackResult;
      }
    }

    // Fallback: If orientation-constrained solve still fails, retry without orientation
    // (targets far from the arm's natural orientation zone may not converge with a stiff weight).
    if (!result.converged && approachDirection) {
      const posOnlyResult = solveIK(currentAngles, target, KINEMATIC_CHAIN, {
        tolerance: 0.002,
        maxIterations: 150,
        lambda: 0.1,
      });
      if (posOnlyResult.converged) {
        result = posOnlyResult;
      } else {
        const zeroPosResult = solveIK(
          new Array(currentAngles.length).fill(0),
          target,
          KINEMATIC_CHAIN,
          { tolerance: 0.002, maxIterations: 150, lambda: 0.1 },
        );
        if (zeroPosResult.converged) {
          result = zeroPosResult;
        }
      }
    }

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
