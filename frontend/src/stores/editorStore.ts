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
import { GRID } from "../utils/barraLayout";

export type EditorMode = "CONFIGURACAO" | "GRAVANDO" | "FINALIZADA";

export interface SecondarySubstation {
  id: string;
  name: string;
  sigla: string;
}

// Espaço reservado à direita da SE principal antes de posicionar a 2ª SE —
// generoso o bastante pra não sobrepor diagramas de tamanho comum (barra
// cresce com o nº de circuitos, ver computeBarraLength).
const SECONDARY_SUBSTATION_MARGIN = 600;

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
  /** SE adicional carregada no mesmo canvas pra manobras que envolvem 2 SEs (ver FASE 6). */
  secondarySubstation: SecondarySubstation | null;
  /** IDs (nós e arestas) que vieram da SE secundária — usado pra excluir do save da SE
   *  principal e pra prefixar o texto dos passos gerados a partir desses equipamentos. */
  secondaryIds: ReadonlySet<string>;
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
  loadSecondarySubstation: (substation: SecondarySubstation, nodes: TopologyNode[], edges: Edge[]) => void;
  unloadSecondarySubstation: () => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: "CONFIGURACAO",
  activeSubstationId: null,
  nodes: [],
  edges: [],
  wireMode: false,
  wirePending: null,
  secondarySubstation: null,
  secondaryIds: new Set(),
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
  loadSecondarySubstation: (substation, incomingNodes, incomingEdges) =>
    set((state) => {
      // Remove qualquer SE secundária carregada antes (troca em vez de empilhar).
      const baseNodes = state.nodes.filter((n) => !state.secondaryIds.has(n.id));
      const baseEdges = state.edges.filter(
        (e) => !state.secondaryIds.has(e.id) && !state.secondaryIds.has(e.source) && !state.secondaryIds.has(e.target)
      );
      const maxX = baseNodes.reduce((max, n) => Math.max(max, n.position.x), 0);
      const offsetX = Math.ceil((maxX + SECONDARY_SUBSTATION_MARGIN) / GRID) * GRID;
      const offsetNodes = incomingNodes.map(
        (n) => ({ ...n, position: { x: n.position.x + offsetX, y: n.position.y } }) as TopologyNode
      );
      const ids = new Set<string>([...offsetNodes.map((n) => n.id), ...incomingEdges.map((e) => e.id)]);
      return {
        nodes: pruneUnusedBarHandles([...baseNodes, ...offsetNodes], [...baseEdges, ...incomingEdges]),
        edges: [...baseEdges, ...incomingEdges],
        secondarySubstation: substation,
        secondaryIds: ids,
      };
    }),
  unloadSecondarySubstation: () =>
    set((state) => ({
      nodes: state.nodes.filter((n) => !state.secondaryIds.has(n.id)),
      edges: state.edges.filter((e) => !state.secondaryIds.has(e.id)),
      secondarySubstation: null,
      secondaryIds: new Set(),
    })),
  reset: () =>
    set({
      mode: "CONFIGURACAO",
      activeSubstationId: null,
      nodes: [],
      edges: [],
      wireMode: false,
      wirePending: null,
      secondarySubstation: null,
      secondaryIds: new Set(),
    }),
}));
