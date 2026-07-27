import { applyEdgeChanges, applyNodeChanges, type Edge } from "@xyflow/react";
import { create } from "zustand";
import type { BarraData, BarraHandleLado, EquipmentKind, Rotation, TopologyNode } from "../types/topology";
import type { TopologyBindings, WirePending } from "./topologyBindings";
import { pruneUnusedBarHandles } from "../utils/pruneUnusedBarHandles";

export type { WirePending } from "./topologyBindings";

const ROTATABLE_KINDS: ReadonlySet<EquipmentKind> = new Set([
  "barra",
  "disjuntor",
  "chave",
  "religador",
  "transformador",
  "tf3",
  "tp",
  "tc",
  "jumper",
  "chave_provisoria",
]);

/** Estado do editor de cadastro de subestação (topologia persistida, uma SE por vez). */
interface EditorState extends TopologyBindings {
  activeSubstationId: string | null;
  setActiveSubstationId: (id: string | null) => void;
  setTopology: (nodes: TopologyNode[], edges: Edge[]) => void;
  addNode: (node: TopologyNode) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeSubstationId: null,
  nodes: [],
  edges: [],
  wireMode: false,
  wirePending: null,
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
  startWire: (pending: WirePending) => set({ wirePending: pending }),
  cancelWire: () => set({ wirePending: null }),
  addBarHandle: (nodeId, position, lado: BarraHandleLado) => {
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
  reset: () =>
    set({
      activeSubstationId: null,
      nodes: [],
      edges: [],
      wireMode: false,
      wirePending: null,
    }),
}));
