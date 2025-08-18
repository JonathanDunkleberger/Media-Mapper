import { create } from 'zustand';

interface UIState {
  activeMood: string | null;
  setActiveMood: (mood: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeMood: null,
  setActiveMood: (activeMood: string | null) => set({ activeMood }),
}));
