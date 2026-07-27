import { create } from "zustand";
import type { ManeuverStatus, ManeuverStep } from "../types/maneuver";

interface ManeuverState {
  /** ID do registro no backend — null enquanto a manobra ainda não foi criada
   *  (ver handleStartRecording em SubstationEditorPage.tsx). */
  maneuverId: string | null;
  /** Status no backend (não confundir com editorStore.mode, que é só do canvas).
   *  FINALIZADA aqui trava a edição de passos/cabeçalho pra sempre. */
  status: ManeuverStatus | null;
  steps: ManeuverStep[];
  setManeuverId: (id: string | null) => void;
  setStatus: (status: ManeuverStatus | null) => void;
  setSteps: (steps: ManeuverStep[]) => void;
  addStep: (step: ManeuverStep) => void;
  removeStep: (stepId: string) => void;
  reset: () => void;
}

export const useManeuverStore = create<ManeuverState>((set) => ({
  maneuverId: null,
  status: null,
  steps: [],
  setManeuverId: (id) => set({ maneuverId: id }),
  setStatus: (status) => set({ status }),
  setSteps: (steps) => set({ steps }),
  addStep: (step) => set((state) => ({ steps: [...state.steps, step] })),
  removeStep: (stepId) => set((state) => ({ steps: state.steps.filter((s) => s.id !== stepId) })),
  reset: () => set({ maneuverId: null, status: null, steps: [] }),
}));
