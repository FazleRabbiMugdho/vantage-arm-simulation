import type { KinematicChain } from './chain';
import {
  Mat4, mat4Identity, mat4Multiply,
  mat4Translate, mat4Rotate, mat4GetPosition,
} from './matrix';

export function computeTipPosition(
  angles: number[],
  chain: KinematicChain,
): [number, number, number] {
  let t: Mat4 = mat4Identity();

  for (let i = 0; i < chain.joints.length; i++) {
    const j = chain.joints[i];
    const angle = angles[i] ?? 0;
    t = mat4Multiply(t, mat4Translate(j.origin[0], j.origin[1], j.origin[2]));
    t = mat4Multiply(t, mat4Rotate(j.axis, angle));
  }

  t = mat4Multiply(
    t,
    mat4Translate(chain.tipOffset[0], chain.tipOffset[1], chain.tipOffset[2]),
  );

  return mat4GetPosition(t);
}

/**
 * Compute the local Z-axis direction of the end-effector frame.
 * This tells us which direction the stylus is pointing.
 * For key-pressing, we want this to align with [0, 0, -1] (pointing downward in URDF frame).
 */
export function computeTipDirection(
  angles: number[],
  chain: KinematicChain,
): [number, number, number] {
  let t: Mat4 = mat4Identity();

  for (let i = 0; i < chain.joints.length; i++) {
    const j = chain.joints[i];
    const angle = angles[i] ?? 0;
    t = mat4Multiply(t, mat4Translate(j.origin[0], j.origin[1], j.origin[2]));
    t = mat4Multiply(t, mat4Rotate(j.axis, angle));
  }

  // The Z-axis of the end-effector frame is the third column of the rotation matrix.
  // In our row-major Mat4 layout: column 2 = [m[2], m[6], m[10]]
  const zx = t[2];
  const zy = t[6];
  const zz = t[10];
  const len = Math.sqrt(zx * zx + zy * zy + zz * zz);
  if (len < 1e-10) return [0, 0, 1];
  return [zx / len, zy / len, zz / len];
}
