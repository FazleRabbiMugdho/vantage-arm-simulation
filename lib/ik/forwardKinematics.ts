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
