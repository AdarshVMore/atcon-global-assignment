import { create } from "zustand";

interface PipelineFilterState {
  stageId: string | null;
  setStageId: (stageId: string | null) => void;
}

// Pipeline board filter state (Phase 7) — kept separate from server data,
// which TanStack Query owns.
export const usePipelineFilterStore = create<PipelineFilterState>((set) => ({
  stageId: null,
  setStageId: (stageId) => set({ stageId }),
}));
