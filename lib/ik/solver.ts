import type { KinematicChain } from './chain';
import { computeTipPosition } from './forwardKinematics';

const EPS = 1e-6;
const DEFAULT_LAMBDA = 0.1;
const DEFAULT_TOLERANCE = 0.002;
const DEFAULT_MAX_ITER = 100;

export interface IKSolution {
  angles: number[];
  converged: boolean;
  iterations: number;
  finalError: number;
}

function mat3x3Identity(): number[][] {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function mat3x3Inverse(m: number[][]): number[][] {
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-15) {
    return mat3x3Identity();
  }

  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

function mat3x3MultiplyVec(m: number[][], v: number[]): number[] {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

function vec3Sub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Len(v: number[]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function solveIK(
  currentAngles: number[],
  target: [number, number, number],
  chain: KinematicChain,
  options?: {
    tolerance?: number;
    maxIterations?: number;
    lambda?: number;
  },
): IKSolution {
  const tolerance = options?.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITER;
  const lambda = options?.lambda ?? DEFAULT_LAMBDA;
  const nJoints = chain.joints.length;

  let angles = [...currentAngles];
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    const pos = computeTipPosition(angles, chain);
    const error = vec3Sub(target, pos);
    const errLen = vec3Len(error);

    if (errLen < tolerance) {
      return {
        angles,
        converged: true,
        iterations: iteration + 1,
        finalError: errLen,
      };
    }

    const jacobian = computeJacobian(angles, chain, pos);

    const jt = transpose3x7(jacobian);
    const jjt = multiply3x3x7(jacobian, jt);

    for (let r = 0; r < 3; r++) {
      jjt[r][r] += lambda * lambda;
    }

    const jjtInv = mat3x3Inverse(jjt);
    const delta = mat3x3MultiplyVec(jjtInv, error);
    const dq = multiply7x3Vec(jt, delta);

    for (let i = 0; i < nJoints; i++) {
      angles[i] += dq[i];
      angles[i] = Math.max(
        chain.limits[i].lower,
        Math.min(chain.limits[i].upper, angles[i]),
      );
    }
  }

  const finalPos = computeTipPosition(angles, chain);
  return {
    angles,
    converged: false,
    iterations: maxIterations,
    finalError: vec3Len(vec3Sub(target, finalPos)),
  };
}

function computeJacobian(
  angles: number[],
  chain: KinematicChain,
  currentPos: [number, number, number],
): number[][] {
  const nJoints = chain.joints.length;
  const jacobian: number[][] = [];

  for (let i = 0; i < nJoints; i++) {
    const anglesPerturbed = [...angles];
    anglesPerturbed[i] += EPS;
    const posPerturbed = computeTipPosition(anglesPerturbed, chain);

    jacobian.push([
      (posPerturbed[0] - currentPos[0]) / EPS,
      (posPerturbed[1] - currentPos[1]) / EPS,
      (posPerturbed[2] - currentPos[2]) / EPS,
    ]);
  }

  return jacobian;
}

function transpose3x7(j: number[][]): number[][] {
  const t: number[][] = [[], [], []];
  for (let i = 0; i < j.length; i++) {
    t[0][i] = j[i][0];
    t[1][i] = j[i][1];
    t[2][i] = j[i][2];
  }
  return t;
}

function multiply3x3x7(a: number[][], b: number[][]): number[][] {
  const result: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = 0; k < a.length; k++) {
        sum += a[k][r] * b[c][k];
      }
      result[r][c] = sum;
    }
  }
  return result;
}

function multiply7x3Vec(m: number[][], v: number[]): number[] {
  const result: number[] = new Array(m[0].length).fill(0);
  for (let i = 0; i < m[0].length; i++) {
    for (let r = 0; r < 3; r++) {
      result[i] += m[r][i] * v[r];
    }
  }
  return result;
}
