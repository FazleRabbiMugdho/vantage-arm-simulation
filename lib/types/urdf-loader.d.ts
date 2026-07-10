declare module 'urdf-loader' {
  import { Object3D, LoadingManager } from 'three';

  interface URDFJoint {
    name: string;
    jointType: string;
    angle: number;
    setJointValue(value: number): void;
  }

  interface URDFRobot extends Object3D {
    joints: Record<string, URDFJoint>;
    setJointValues(values: Record<string, number>): void;
  }

  export default class URDFLoader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onComplete: (robot: URDFRobot) => void,
      onProgress?: () => void,
      onError?: (error: Error) => void
    ): void;
    loadAsync(url: string): Promise<URDFRobot>;
    parse(urdfContent: string | Document | Element): URDFRobot;
  }
}
