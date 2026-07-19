import { applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type NodeChange } from "@xyflow/react";
import { create } from "zustand";
import type { TopologyNode } from "../types/topology";

export type EditorMode = "CONFIGURACAO" | "GRAVANDO" | "FINALIZADA";

interface EditorState {
  mode: EditorMode;
  activeSubstationId: string | null;
  nodes: TopologyNode[];
  edges: Edge[];
  setMode: (mode: EditorMode) => void;
  setActiveSubstationId: (id: string | null) => void;
  setTopology: (nodes: TopologyNode[], edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<TopologyNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: TopologyNode) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  addEdge: (connection: Connection) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: "CONFIGURACAO",
  activeSubstationId: null,
  nodes: [],
  edges: [],
  setMode: (mode) => set({ mode }),
  setActiveSubstationId: (id) => set({ activeSubstationId: id }),
  setTopology: (nodes, edges) => set({ nodes, edges }),
  onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? ({ ...node, data: { ...node.data, ...data } } as TopologyNode) : node
      ),
    })),
  addEdge: (connection) =>
    set((state) => ({
      edges: [
        ...state.edges,
        {
          // usa crypto.randomUUID (não um contador) para não colidir com arestas
          // já persistidas de sessões/reloads anteriores entre o mesmo par de nós
          id: `e-${crypto.randomUUID()}`,
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        },
      ],
    })),
  reset: () => set({ mode: "CONFIGURACAO", activeSubstationId: null, nodes: [], edges: [] }),
}));
