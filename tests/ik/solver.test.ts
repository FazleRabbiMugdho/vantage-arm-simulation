import { KINEMATIC_CHAIN } from '../../lib/ik/chain';
import { solveIK } from '../../lib/ik/solver';
import { computeTipPosition } from '../../lib/ik/forwardKinematics';
import { KEY_POSITIONS } from '../../lib/config/keyConfig';

const ZERO_ANGLES = [0, 0, 0, 0, 0, 0, 0];

function runTest(
  name: string,
  target: [number, number, number],
  initialAngles: number[] = ZERO_ANGLES,
) {
  const result = solveIK(initialAngles, target, KINEMATIC_CHAIN, {
    tolerance: 0.002,
    maxIterations: 100,
    lambda: 0.1,
  });

  const achieved = computeTipPosition(result.angles, KINEMATIC_CHAIN);
  const dx = ((achieved[0] - target[0]) * 1000).toFixed(2);
  const dy = ((achieved[1] - target[1]) * 1000).toFixed(2);
  const dz = ((achieved[2] - target[2]) * 1000).toFixed(2);
  const errMm = (result.finalError * 1000).toFixed(2);

  // Check limits
  let limitViolation = false;
  for (let i = 0; i < result.angles.length; i++) {
    const lim = KINEMATIC_CHAIN.limits[i];
    if (result.angles[i] < lim.lower - 1e-6 || result.angles[i] > lim.upper + 1e-6) {
      console.error(`  LIMIT VIOLATION joint ${i}: ${result.angles[i]} not in [${lim.lower}, ${lim.upper}]`);
      limitViolation = true;
    }
  }

  const status = result.converged ? '✅ CONVERGED' : '❌ DID NOT CONVERGE';
  console.log(`${status} | ${name}`);
  console.log(`  Target:      (${target.map(v => v.toFixed(3)).join(', ')}) m`);
  console.log(`  Achieved:    (${achieved.map(v => v.toFixed(3)).join(', ')}) m`);
  console.log(`  Error:       dx=${dx} mm, dy=${dy} mm, dz=${dz} mm | dist=${errMm} mm`);
  console.log(`  Iterations:  ${result.iterations}`);
  console.log(`  Angles:      [${result.angles.map(a => (a * 180 / Math.PI).toFixed(1)).join(', ')}]°`);
  if (limitViolation) console.log(`  ⚠️  JOINT LIMIT VIOLATION DETECTED`);
  console.log('');
}

console.log('========================================');
console.log('  IK Solver Test Suite');
console.log('  Damped Least Squares | 7-DOF | 2mm tolerance');
console.log('========================================\n');

// Test 1-6: All key positions
console.log('--- Key Panel Positions ---');
for (let i = 0; i < KEY_POSITIONS.length; i++) {
  const k = KEY_POSITIONS[i];
  runTest(`Key ${i + 1}`, [k.x, k.y, k.z]);
}

// Test 7: Above key 1 (approach point)
console.log('--- Approach Points ---');
const k1 = KEY_POSITIONS[0];
runTest('Key 1 approach (40mm above)', [k1.x, k1.y, k1.z + 0.04]);

// Test 8: Center of panel
runTest('Panel center', [0.550, 0, 0.05]);

// Test 9: Far reachable point
runTest('Far reachable (1.0, 0.0, 0.3)', [1.0, 0.0, 0.3]);

// Test 10: Unreachable target (should still converge to closest within limits)
console.log('--- Edge Cases ---');
runTest('Far unreachable (2.0, 0, 0.5)', [2.0, 0, 0.5]);

// Test 11: High point
runTest('High point (0.5, 0, 1.0)', [0.5, 0, 1.0]);

// Test 12: Start from non-zero initial pose
console.log('--- Non-Zero Initial Pose ---');
const bentAngles = [0, 0.5, -0.8, 0, 0.3, 0, 0];
runTest('Key 3 from bent pose', [0.6, 0.05, 0.05], bentAngles);

// Test 13: Start from HOME_POSE to all keys
console.log('--- HOME_POSE Initial Pose to All Keys ---');
const HOME_POSE = [0, 0.8, -1.0, 0, 0.8, 0, 0];
for (let i = 0; i < KEY_POSITIONS.length; i++) {
  const k = KEY_POSITIONS[i];
  runTest(`Key ${i + 1} from HOME_POSE`, [k.x, k.y, k.z], HOME_POSE);
}
for (let i = 0; i < KEY_POSITIONS.length; i++) {
  const k = KEY_POSITIONS[i];
  runTest(`Key ${i + 1} approach from HOME_POSE`, [k.x, k.y, k.z + 0.04], HOME_POSE);
}

// Summary
console.log('========================================');
console.log('  Tests complete');
console.log('========================================');
