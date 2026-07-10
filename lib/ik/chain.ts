export interface ChainJoint {
  axis: [number, number, number];
  origin: [number, number, number];
}

export interface JointLimit {
  lower: number;
  upper: number;
}

export interface KinematicChain {
  joints: ChainJoint[];
  limits: JointLimit[];
  tipOffset: [number, number, number];
}

export const KINEMATIC_CHAIN: KinematicChain = {
  joints: [
    { axis: [0, 0, 1], origin: [0, 0, 0.060] },  // joint_1
    { axis: [0, 1, 0], origin: [0, 0, 0.250] },  // joint_2
    { axis: [0, 1, 0], origin: [0, 0, 0.250] },  // joint_3
    { axis: [0, 0, 1], origin: [0, 0, 0.250] },  // joint_4
    { axis: [0, 1, 0], origin: [0, 0, 0.150] },  // joint_5
    { axis: [0, 0, 1], origin: [0, 0, 0.250] },  // joint_6
    { axis: [0, 1, 0], origin: [0, 0, 0.150] },  // stylus_pitch
  ],
  limits: [
    { lower: -3.1416, upper: 3.1416 },   // joint_1
    { lower: -2.0944, upper: 2.0944 },   // joint_2
    { lower: -2.6180, upper: 2.6180 },   // joint_3
    { lower: -3.1416, upper: 3.1416 },   // joint_4
    { lower: -2.0944, upper: 2.0944 },   // joint_5
    { lower: -3.1416, upper: 3.1416 },   // joint_6
    { lower: -2.0944, upper: 2.0944 },   // stylus_pitch
  ],
  tipOffset: [0, 0, 0.137],
};

export const IK_JOINT_NAMES = [
  'joint_1', 'joint_2', 'joint_3', 'joint_4',
  'joint_5', 'joint_6', 'stylus_pitch',
];
