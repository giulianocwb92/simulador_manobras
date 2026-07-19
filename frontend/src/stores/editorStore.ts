import { create } from "zustand";

export type EditorMode = "CONFIGURACAO" | "GRAVANDO" | "FINALIZADA";

interface EditorState {
  mode: EditorMode;
  activeSubstationId: string | null;
  setMode: (mode: EditorMode) => void;
  setActiveSubstationId: (id: string | null) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: "CONFIGURACAO",
  activeSubstationId: null,
  setMode: (mode) => set({ mode }),
  setActiveSubstationId: (id) => set({ activeSubstationId: id }),
  reset: () => set({ mode: "CONFIGURACAO", activeSubstationId: null }),
}));
