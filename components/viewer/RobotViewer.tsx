'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from 'urdf-loader';
import { useJointStore } from '@/lib/store/jointState';
import { createKeyPanel } from '@/components/panel/KeyPanel';

export default function RobotViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const setJointAngles = useJointStore((s) => s.setJointAngles);
  const setEePosition = useJointStore((s) => s.setEePosition);
  const setLoading = useJointStore((s) => s.setLoading);
  const setError = useJointStore((s) => s.setError);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(1.5, 1.2, 1.8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.3, 0.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-2, 1, -2);
    scene.add(fillLight);

    // Grid
    const grid = new THREE.GridHelper(2, 20, 0x88aaff, 0x446688);
    scene.add(grid);

    // Load URDF
    setLoading(true);
    const loader = new URDFLoader();
    loader.load(
      '/6_dof_arm.urdf',
      (robot: any) => {
        robotRef.current = robot;
        scene.add(robot);

        // Log all actuated joints
        const jointNames = Object.keys(robot.joints).sort();
        const actuatedJoints = jointNames.filter(
          (n) => robot.joints[n].jointType !== 'fixed'
        );
        console.log('URDF loaded — actuated joints:', actuatedJoints);
        console.log('URDF loaded — all joints:', jointNames);

        // Verify expected joints
        const expected = [
          'joint_1',
          'joint_2',
          'joint_3',
          'joint_4',
          'joint_5',
          'joint_6',
          'stylus_pitch',
        ];
        const found = expected.filter((n) => actuatedJoints.includes(n));
        const missing = expected.filter((n) => !actuatedJoints.includes(n));
        if (missing.length > 0) {
          console.warn('Missing expected joints:', missing);
        } else {
          console.log(
            `✓ All ${found.length}/7 actuated joints found + stylus_tip_frame (fixed)`
          );
        }

        // Set initial angles (all zeros)
        robot.setJointValues({
          joint_1: 0,
          joint_2: 0,
          joint_3: 0,
          joint_4: 0,
          joint_5: 0,
          joint_6: 0,
          stylus_pitch: 0,
        });

        // Render key panel
        createKeyPanel(scene);

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('URDF load error:', err);
        setError(`Failed to load URDF: ${err.message}`);
        setLoading(false);
      }
    );

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animFrame: number;
    const animate = () => {
      animFrame = requestAnimationFrame(animate);

      const state = useJointStore.getState();
      const robot = robotRef.current;

      if (robot && !state.loading) {
        robot.setJointValues({
          joint_1: state.jointAngles[0],
          joint_2: state.jointAngles[1],
          joint_3: state.jointAngles[2],
          joint_4: state.jointAngles[3],
          joint_5: state.jointAngles[4],
          joint_6: state.jointAngles[5],
          stylus_pitch: state.jointAngles[6],
        });

        // Compute world position of stylus_tip
        const tip = robot.getObjectByName('stylus_tip');
        if (tip) {
          const worldPos = new THREE.Vector3();
          tip.getWorldPosition(worldPos);
          useJointStore.getState().setEePosition([
            Math.round(worldPos.x * 1000) / 1000,
            Math.round(worldPos.y * 1000) / 1000,
            Math.round(worldPos.z * 1000) / 1000,
          ]);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [setJointAngles, setEePosition, setLoading, setError]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <JointCountOverlay />
    </div>
  );
}

function JointCountOverlay() {
  const loading = useJointStore((s) => s.loading);
  const error = useJointStore((s) => s.error);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-lg text-gray-300">Loading URDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
        <div className="rounded-lg border border-red-600 bg-red-900/50 p-6 text-center">
          <p className="text-lg text-red-400">{error}</p>
          <p className="mt-2 text-sm text-gray-400">
            Check that the URDF file exists in /public/
          </p>
        </div>
      </div>
    );
  }

  return null;
}
