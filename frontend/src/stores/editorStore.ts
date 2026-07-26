import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { create } from "zustand";
import type { BarraData, BarraHandleLado, EquipmentKind, Rotation, TopologyNode } from "../types/topology";

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

export interface WirePending {
  sourceNodeId: string;
  sourceHandleId: string;
  sourcePosition: XYPosition;
}

/**
 * Remove das barras os handles dinâmicos (criados via addBarHandle) que não têm
 * mais nenhuma aresta ligada — evita handle "fantasma" (e barra que não encolhe)
 * depois que o wire que o criou é apagado.
 */
function pruneUnusedBarHandles(nodes: TopologyNode[], edges: Edge[]): TopologyNode[] {
  const usedHandleIds = new Set<string>();
  for (const edge of edges) {
    if (edge.sourceHandle) usedHandleIds.add(`${edge.source}:${edge.sourceHandle}`);
    if (edge.targetHandle) usedHandleIds.add(`${edge.target}:${edge.targetHandle}`);
  }
  return nodes.map((node) => {
    if (node.type !== "barra") return node;
    const barraData = node.data as BarraData;
    const handles = (barraData.handles ?? []).filter((h) => usedHandleIds.has(`${node.id}:${h.id}`));
    if (handles.length === (barraData.handles ?? []).length) return node;
    return { ...node, data: { ...node.data, handles } } as TopologyNode;
  });
}

interface EditorState {
  mode: EditorMode;
  activeSubstationId: string | null;
  nodes: TopologyNode[];
  edges: Edge[];
  wireMode: boolean;
  wirePending: WirePending | null;
  setMode: (mode: EditorMode) => void;
  setActiveSubstationId: (id: string | null) => void;
  setTopology: (nodes: TopologyNode[], edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<TopologyNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: TopologyNode) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  addEdge: (connection: Connection) => void;
  removeEdge: (edgeId: string) => void;
  rotateSelectedNodes: () => void;
  setWireMode: (active: boolean) => void;
  startWire: (pending: WirePending) => void;
  cancelWire: () => void;
  addBarHandle: (nodeId: string, position: number, lado: BarraHandleLado) => string;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: "CONFIGURACAO",
  activeSubstationId: null,
  nodes: [],
  edges: [],
  wireMode: false,
  wirePending: null,
  setMode: (mode) => set({ mode }),
  setActiveSubstationId: (id) => set({ activeSubstationId: id }),
  setTopology: (nodes, edges) => set({ nodes: pruneUnusedBarHandles(nodes, edges), edges }),
  onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  onEdgesChange: (changes) =>
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      return { edges, nodes: pruneUnusedBarHandles(state.nodes, edges) };
    }),
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
  removeEdge: (edgeId) =>
    set((state) => {
      const edges = state.edges.filter((edge) => edge.id !== edgeId);
      return { edges, nodes: pruneUnusedBarHandles(state.nodes, edges) };
    }),
  rotateSelectedNodes: () =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (!node.selected || !ROTATABLE_KINDS.has(node.type as EquipmentKind)) return node;
        const current = ((node.data as { rotation?: Rotation }).rotation ?? 0) as Rotation;
        const next = ((current + 90) % 360) as Rotation;
        return { ...node, data: { ...node.data, rotation: next } } as TopologyNode;
      }),
    })),
  setWireMode: (active) =>
    set((state) => ({ wireMode: active, wirePending: active ? state.wirePending : null })),
  startWire: (pending) => set({ wirePending: pending }),
  cancelWire: () => set({ wirePending: null }),
  addBarHandle: (nodeId, position, lado) => {
    const handleId = `h-${crypto.randomUUID()}`;
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId || node.type !== "barra") return node;
        const barraData = node.data as BarraData;
        const handles = [...(barraData.handles ?? []), { id: handleId, position, lado }];
        return { ...node, data: { ...node.data, handles } } as TopologyNode;
      }),
    }));
    return handleId;
  },
  reset: () => set({ mode: "CONFIGURACAO", activeSubstationId: null, nodes: [], edges: [], wireMode: false, wirePending: null }),
}));
