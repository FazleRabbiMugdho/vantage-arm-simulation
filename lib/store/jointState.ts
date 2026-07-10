import { create } from 'zustand';
import type { LogEntry } from '@/lib/motion/types';

export interface JointState {
  jointAngles: number[];
  eePosition: [number, number, number];
  loading: boolean;
  error: string | null;
  activityLog: LogEntry[];
  setJointAngles: (angles: number[]) => void;
  setEePosition: (pos: [number, number, number]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addLogEntry: (entry: LogEntry) => void;
  clearLog: () => void;
}

export const useJointStore = create<JointState>((set) => ({
  jointAngles: [0, 0, 0, 0, 0, 0, 0],
  eePosition: [0, 0, 0],
  loading: true,
  error: null,
  activityLog: [],
  setJointAngles: (angles) => set({ jointAngles: angles }),
  setEePosition: (pos) => set({ eePosition: pos }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addLogEntry: (entry) =>
    set((state) => ({ activityLog: [...state.activityLog, entry] })),
  clearLog: () => set({ activityLog: [] }),
}));
