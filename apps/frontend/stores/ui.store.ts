import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  candidateDrawerId: string | null;
  openCandidateDrawer: (candidateId: string) => void;
  closeCandidateDrawer: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  candidateDrawerId: null,
  openCandidateDrawer: (candidateId) => set({ candidateDrawerId: candidateId }),
  closeCandidateDrawer: () => set({ candidateDrawerId: null }),
}));
