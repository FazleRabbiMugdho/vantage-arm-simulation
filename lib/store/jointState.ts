import { create } from 'zustand';

export interface JointState {
  jointAngles: number[];
  eePosition: [number, number, number];
  loading: boolean;
  error: string | null;
  setJointAngles: (angles: number[]) => void;
  setEePosition: (pos: [number, number, number]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useJointStore = create<JointState>((set) => ({
  jointAngles: [0, 0, 0, 0, 0, 0, 0],
  eePosition: [0, 0, 0],
  loading: true,
  error: null,
  setJointAngles: (angles) => set({ jointAngles: angles }),
  setEePosition: (pos) => set({ eePosition: pos }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
