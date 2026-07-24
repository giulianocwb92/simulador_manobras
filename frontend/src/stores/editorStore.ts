import { applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type NodeChange } from "@xyflow/react";
import { create } from "zustand";
import type { EquipmentKind, Rotation, TopologyNode } from "../types/topology";

export type EditorMode = "CONFIGURACAO" | "GRAVANDO" | "FINALIZADA";

const ROTATABLE_KINDS: ReadonlySet<EquipmentKind> = new Set([
  "barra",
  "disjuntor",
  "chave",
  "religador",
  "transformador",
  "tf3",
  "tp",
  "tc",
]);

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
  rotateSelectedNodes: () => void;
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
  rotateSelectedNodes: () =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (!node.selected || !ROTATABLE_KINDS.has(node.type as EquipmentKind)) return node;
        const current = ((node.data as { rotation?: Rotation }).rotation ?? 0) as Rotation;
        const next = ((current + 90) % 360) as Rotation;
        return { ...node, data: { ...node.data, rotation: next } } as TopologyNode;
      }),
    })),
  reset: () => set({ mode: "CONFIGURACAO", activeSubstationId: null, nodes: [], edges: [] }),
}));
