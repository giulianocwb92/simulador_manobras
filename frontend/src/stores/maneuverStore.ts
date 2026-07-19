import { create } from "zustand";
import type { ManeuverHeader, ManeuverStep } from "../types/maneuver";

const emptyHeader: ManeuverHeader = {
  numero: null,
  data: null,
  responsavel: null,
  area: null,
  substations: [],
  descricao_isolamento: null,
};

interface ManeuverState {
  header: ManeuverHeader;
  steps: ManeuverStep[];
  setHeader: (header: Partial<ManeuverHeader>) => void;
  addStep: (step: ManeuverStep) => void;
  removeStep: (stepId: string) => void;
  reorderSteps: (orderedIds: string[]) => void;
  reset: () => void;
}

export const useManeuverStore = create<ManeuverState>((set) => ({
  header: emptyHeader,
  steps: [],
  setHeader: (header) => set((state) => ({ header: { ...state.header, ...header } })),
  addStep: (step) => set((state) => ({ steps: [...state.steps, step] })),
  removeStep: (stepId) => set((state) => ({ steps: state.steps.filter((s) => s.id !== stepId) })),
  reorderSteps: (orderedIds) =>
    set((state) => {
      const byId = new Map(state.steps.map((step) => [step.id, step]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((step): step is ManeuverStep => step !== undefined)
        .map((step, index) => ({ ...step, order: index + 1 }));
      return { steps: reordered };
    }),
  reset: () => set({ header: emptyHeader, steps: [] }),
}));
