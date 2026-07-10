export interface JointLimit {
  lower: number;
  upper: number;
  lowerDeg: number;
  upperDeg: number;
}

export const JOINT_LIMITS: Record<string, JointLimit> = {
  joint_1:       { lower: -3.1416, upper: 3.1416, lowerDeg: -180, upperDeg: 180 },
  joint_2:       { lower: -2.0944, upper: 2.0944, lowerDeg: -120, upperDeg: 120 },
  joint_3:       { lower: -2.6180, upper: 2.6180, lowerDeg: -150, upperDeg: 150 },
  joint_4:       { lower: -3.1416, upper: 3.1416, lowerDeg: -180, upperDeg: 180 },
  joint_5:       { lower: -2.0944, upper: 2.0944, lowerDeg: -120, upperDeg: 120 },
  joint_6:       { lower: -3.1416, upper: 3.1416, lowerDeg: -180, upperDeg: 180 },
  stylus_pitch:  { lower: -2.0944, upper: 2.0944, lowerDeg: -120, upperDeg: 120 },
};

export const JOINT_NAMES = Object.keys(JOINT_LIMITS);

export const WARNING_THRESHOLD_DEG = 5;
export const WARNING_THRESHOLD_RAD = 5 * (Math.PI / 180);
