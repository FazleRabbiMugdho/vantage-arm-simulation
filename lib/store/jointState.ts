import { create } from 'zustand';
import type { LogEntry } from '@/lib/motion/types';

/**
 * Home pose — a bent, well-conditioned configuration that avoids the
 * kinematic singularity at all-zeros (arm straight up on Z axis).
 * This gives the Jacobian full rank for all 3 axes immediately.
 * Roughly points the arm forward and down toward the key panel area.
 */
export const HOME_POSE: number[] = [0, 0.8, -1.0, 0, 0.8, 0, 0];

export interface JointState {
  jointAngles: number[];
  eePosition: [number, number, number];
  loading: boolean;
  error: string | null;
  activityLog: LogEntry[];
  activeKeyIndex: number | null;
  setJointAngles: (angles: number[]) => void;
  setEePosition: (pos: [number, number, number]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addLogEntry: (entry: LogEntry) => void;
  clearLog: () => void;
  setActiveKey: (index: number | null) => void;
}

export const useJointStore = create<JointState>((set) => ({
  jointAngles: [...HOME_POSE],
  eePosition: [0, 0, 0],
  loading: true,
  error: null,
  activityLog: [],
  activeKeyIndex: null,
  setJointAngles: (angles) => set({ jointAngles: angles }),
  setEePosition: (pos) => set({ eePosition: pos }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addLogEntry: (entry) =>
    set((state) => ({ activityLog: [...state.activityLog, entry] })),
  clearLog: () => set({ activityLog: [] }),
  setActiveKey: (index) => set({ activeKeyIndex: index }),
}));
