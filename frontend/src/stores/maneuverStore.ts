import { create } from "zustand";
import type { ManeuverHeader, ManeuverStatus, ManeuverStep } from "../types/maneuver";

const emptyHeader: ManeuverHeader = {
  numero: null,
  data: null,
  responsavel: null,
  area: null,
  substations: [],
  descricao_isolamento: null,
};

interface ManeuverState {
  /** ID do registro no backend — null enquanto a manobra ainda não foi criada
   *  (ver handleStartRecording em SubstationEditorPage.tsx). */
  maneuverId: string | null;
  /** Status no backend (não confundir com editorStore.mode, que é só do canvas).
   *  FINALIZADA aqui trava a edição de passos/cabeçalho pra sempre. */
  status: ManeuverStatus | null;
  header: ManeuverHeader;
  steps: ManeuverStep[];
  setManeuverId: (id: string | null) => void;
  setStatus: (status: ManeuverStatus | null) => void;
  setHeader: (header: Partial<ManeuverHeader>) => void;
  setSteps: (steps: ManeuverStep[]) => void;
  addStep: (step: ManeuverStep) => void;
  updateStep: (stepId: string, description: string) => void;
  removeStep: (stepId: string) => void;
  reorderSteps: (orderedIds: string[]) => void;
  reset: () => void;
}

export const useManeuverStore = create<ManeuverState>((set) => ({
  maneuverId: null,
  status: null,
  header: emptyHeader,
  steps: [],
  setManeuverId: (id) => set({ maneuverId: id }),
  setStatus: (status) => set({ status }),
  setHeader: (header) => set((state) => ({ header: { ...state.header, ...header } })),
  setSteps: (steps) => set({ steps }),
  addStep: (step) => set((state) => ({ steps: [...state.steps, step] })),
  updateStep: (stepId, description) =>
    set((state) => ({ steps: state.steps.map((s) => (s.id === stepId ? { ...s, description } : s)) })),
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
  reset: () => set({ maneuverId: null, status: null, header: emptyHeader, steps: [] }),
}));
