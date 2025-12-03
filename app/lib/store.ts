import { create } from 'zustand';

interface AppState {
  isConnected: boolean;
  activeNodeCount: number;
  userBandwidthRemaining: number;
  setConnected: (connected: boolean) => void;
  setActiveNodeCount: (count: number) => void;
  setUserBandwidth: (bandwidth: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isConnected: false,
  activeNodeCount: 0,
  userBandwidthRemaining: 0,
  setConnected: (connected) => set({ isConnected: connected }),
  setActiveNodeCount: (count) => set({ activeNodeCount: count }),
  setUserBandwidth: (bandwidth) => set({ userBandwidthRemaining: bandwidth }),
}));
