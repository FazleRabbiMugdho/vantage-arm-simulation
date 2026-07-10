import type { KinematicChain } from './chain';
import { computeTipPosition, computeTipDirection } from './forwardKinematics';

const EPS = 1e-6;
const DEFAULT_LAMBDA = 0.1;
const DEFAULT_TOLERANCE = 0.002;
const DEFAULT_MAX_ITER = 200;

/**
 * Maximum joint-angle step per iteration (radians).
 * Prevents wild overshooting when the target is far away and the
 * Jacobian suggests huge delta-q values.
 */
const MAX_STEP_RAD = 0.15;

export interface IKSolution {
  angles: number[];
  converged: boolean;
  iterations: number;
  finalError: number;
}

function vec3Sub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Len(v: number[]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * General NxN matrix inverse using Gauss-Jordan elimination.
 * Returns identity if singular.
 */
function matNxNInverse(m: number[][]): number[][] {
  const n = m.length;
  // Augmented matrix [m | I]
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    aug[i] = [...m[i]];
    for (let j = 0; j < n; j++) {
      aug[i].push(i === j ? 1 : 0);
    }
  }

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-15) {
      // Singular — return identity
      const ident: number[][] = [];
      for (let i = 0; i < n; i++) {
        ident[i] = new Array(n).fill(0);
        ident[i][i] = 1;
      }
      return ident;
    }
    // Swap rows
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    // Scale pivot row
    const scale = 1 / aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] *= scale;
    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract inverse
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    inv[i] = aug[i].slice(n);
  }
  return inv;
}

/**
 * Multiply NxM matrix by M-vector, returning N-vector.
 */
function matVecMul(m: number[][], v: number[]): number[] {
  const n = m.length;
  const result = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < v.length; j++) {
      result[i] += m[i][j] * v[j];
    }
  }
  return result;
}

/**
 * Transpose an MxN matrix (stored as M rows of N columns) to NxM.
 */
function transpose(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const t: number[][] = [];
  for (let c = 0; c < cols; c++) {
    t[c] = new Array(rows);
    for (let r = 0; r < rows; r++) {
      t[c][r] = m[r][c];
    }
  }
  return t;
}

/**
 * Multiply AxB matrix by BxC matrix, producing AxC.
 */
function matMul(a: number[][], b: number[][]): number[][] {
  const aRows = a.length;
  const bCols = b[0].length;
  const bRows = b.length;
  const result: number[][] = [];
  for (let i = 0; i < aRows; i++) {
    result[i] = new Array(bCols).fill(0);
    for (let j = 0; j < bCols; j++) {
      for (let k = 0; k < bRows; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

export function solveIK(
  currentAngles: number[],
  target: [number, number, number],
  chain: KinematicChain,
  options?: {
    tolerance?: number;
    maxIterations?: number;
    lambda?: number;
    /** Desired approach direction for the stylus (e.g. [0,0,-1] for downward). */
    approachDirection?: [number, number, number];
    /** Weight for orientation error relative to position error. Default 0.3. */
    orientationWeight?: number;
  },
): IKSolution {
  const tolerance = options?.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITER;
  const lambda = options?.lambda ?? DEFAULT_LAMBDA;
  const approachDir = options?.approachDirection ?? null;
  const orientW = options?.orientationWeight ?? 0.3;
  const nJoints = chain.joints.length;

  let angles = [...currentAngles];
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    const pos = computeTipPosition(angles, chain);
    const posError = vec3Sub(target, pos);
    const posErrLen = vec3Len(posError);

    if (posErrLen < tolerance) {
      return {
        angles,
        converged: true,
        iterations: iteration + 1,
        finalError: posErrLen,
      };
    }

    if (approachDir) {
      // 6-DOF solve: 3 position rows + 3 orientation rows
      const tipDir = computeTipDirection(angles, chain);
      // Orientation error: desired approach dir minus current tip direction, weighted
      const oriError = [
        (approachDir[0] - tipDir[0]) * orientW,
        (approachDir[1] - tipDir[1]) * orientW,
        (approachDir[2] - tipDir[2]) * orientW,
      ];

      // Build 6xN Jacobian (N = nJoints)
      // Rows 0-2: position, Rows 3-5: orientation (weighted)
      const jacobian: number[][] = []; // 6 rows, nJoints columns
      for (let r = 0; r < 6; r++) {
        jacobian[r] = new Array(nJoints).fill(0);
      }

      for (let j = 0; j < nJoints; j++) {
        const anglesP = [...angles];
        anglesP[j] += EPS;
        const posP = computeTipPosition(anglesP, chain);
        const dirP = computeTipDirection(anglesP, chain);

        // Position partial derivatives
        jacobian[0][j] = (posP[0] - pos[0]) / EPS;
        jacobian[1][j] = (posP[1] - pos[1]) / EPS;
        jacobian[2][j] = (posP[2] - pos[2]) / EPS;

        // Orientation partial derivatives (weighted)
        jacobian[3][j] = ((dirP[0] - tipDir[0]) / EPS) * orientW;
        jacobian[4][j] = ((dirP[1] - tipDir[1]) / EPS) * orientW;
        jacobian[5][j] = ((dirP[2] - tipDir[2]) / EPS) * orientW;
      }

      const error6 = [...posError, ...oriError];

      // DLS: dq = J^T * (J*J^T + lambda^2 * I)^-1 * e
      const jT = transpose(jacobian); // nJoints x 6
      const jjT = matMul(jacobian, jT); // 6x6
      for (let r = 0; r < 6; r++) {
        jjT[r][r] += lambda * lambda;
      }
      const jjTInv = matNxNInverse(jjT);
      const delta = matVecMul(jjTInv, error6);
      const dq = matVecMul(jT, delta);

      for (let i = 0; i < nJoints; i++) {
        let step = dq[i];
        if (step > MAX_STEP_RAD) step = MAX_STEP_RAD;
        if (step < -MAX_STEP_RAD) step = -MAX_STEP_RAD;
        angles[i] += step;
        angles[i] = Math.max(
          chain.limits[i].lower,
          Math.min(chain.limits[i].upper, angles[i]),
        );
      }
    } else {
      // Position-only 3-DOF solve (original behavior)
      const jacobian = computePositionJacobian(angles, chain, pos);

      const jT = transpose(jacobian); // nJoints x 3
      const jjT = matMul(jacobian, jT); // 3x3
      for (let r = 0; r < 3; r++) {
        jjT[r][r] += lambda * lambda;
      }
      const jjTInv = matNxNInverse(jjT);
      const delta = matVecMul(jjTInv, posError);
      const dq = matVecMul(jT, delta);

      for (let i = 0; i < nJoints; i++) {
        let step = dq[i];
        if (step > MAX_STEP_RAD) step = MAX_STEP_RAD;
        if (step < -MAX_STEP_RAD) step = -MAX_STEP_RAD;
        angles[i] += step;
        angles[i] = Math.max(
          chain.limits[i].lower,
          Math.min(chain.limits[i].upper, angles[i]),
        );
      }
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

/**
 * Compute 3xN position Jacobian via finite differences.
 * Returns 3 rows (x,y,z), N columns (joints).
 */
function computePositionJacobian(
  angles: number[],
  chain: KinematicChain,
  currentPos: [number, number, number],
): number[][] {
  const nJoints = chain.joints.length;
  const jacobian: number[][] = [
    new Array(nJoints).fill(0),
    new Array(nJoints).fill(0),
    new Array(nJoints).fill(0),
  ];

  for (let j = 0; j < nJoints; j++) {
    const anglesPerturbed = [...angles];
    anglesPerturbed[j] += EPS;
    const posPerturbed = computeTipPosition(anglesPerturbed, chain);

    jacobian[0][j] = (posPerturbed[0] - currentPos[0]) / EPS;
    jacobian[1][j] = (posPerturbed[1] - currentPos[1]) / EPS;
    jacobian[2][j] = (posPerturbed[2] - currentPos[2]) / EPS;
  }

  return jacobian;
}
