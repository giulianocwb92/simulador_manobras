import { applyEdgeChanges, applyNodeChanges, type Edge } from "@xyflow/react";
import { create } from "zustand";
import type { BarraData, BarraHandleLado, EquipmentKind, Rotation, TopologyNode } from "../types/topology";
import type { TopologyBindings, WirePending } from "./topologyBindings";
import { pruneUnusedBarHandles } from "../utils/pruneUnusedBarHandles";
import { GRID } from "../utils/barraLayout";

export type SessionMode = "MONTAGEM" | "GRAVANDO" | "FINALIZADA";

export interface SessionSubstation {
  id: string;
  name: string;
  sigla: string;
}

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

// Espaço horizontal reservado entre SEs consecutivas importadas na sessão —
// generoso o bastante pra não sobrepor diagramas de tamanho comum (mesmo
// valor usado antes pela 2ª SE do editor de SE, ver git history).
const SUBSTATION_MARGIN = 600;

/**
 * Store da sessão de manobra efêmera (FRENTE 2, `docs/refatorar_manobras.md`):
 * combina a topologia (read-only) de uma ou mais SEs importadas do banco com
 * uma camada de sessão editável (elementos provisórios, wires entre SEs,
 * ajustes de posição). Nada aqui é persistido de volta em `/substations` — ao
 * reimportar, o estado inicial é sempre o banco.
 */
interface SessionState extends TopologyBindings {
  mode: SessionMode;
  substations: SessionSubstation[];
  /** IDs de nós/arestas que vieram de alguma SE importada — não podem ser
   *  removidos nem editados via modal de propriedades, só reposicionados/
   *  rotacionados pra compor o layout da sessão. */
  baseIds: ReadonlySet<string>;
  /** Sigla da SE de origem de cada nó importado — usado pra prefixar o texto
   *  do passo quando a sessão tem 2+ SEs (ver utils/maneuverStepText.ts). */
  nodeSubstationSigla: ReadonlyMap<string, string>;
  setMode: (mode: SessionMode) => void;
  loadSubstation: (substation: SessionSubstation, nodes: TopologyNode[], edges: Edge[]) => void;
  addNode: (node: TopologyNode) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  mode: "MONTAGEM",
  substations: [],
  baseIds: new Set(),
  nodeSubstationSigla: new Map(),
  nodes: [],
  edges: [],
  wireMode: false,
  wirePending: null,
  setMode: (mode) => set({ mode }),
  loadSubstation: (substation, incomingNodes, incomingEdges) =>
    set((state) => {
      const maxX = state.nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
      const offsetX = state.nodes.length === 0 ? 0 : Math.ceil((maxX + SUBSTATION_MARGIN) / GRID) * GRID;
      const offsetNodes = incomingNodes.map(
        (n) => ({ ...n, position: { x: n.position.x + offsetX, y: n.position.y } }) as TopologyNode
      );
      const newIds = new Set<string>([...offsetNodes.map((n) => n.id), ...incomingEdges.map((e) => e.id)]);
      const nodeSubstationSigla = new Map(state.nodeSubstationSigla);
      for (const node of offsetNodes) nodeSubstationSigla.set(node.id, substation.sigla);
      return {
        substations: [...state.substations, substation],
        nodes: [...state.nodes, ...offsetNodes],
        edges: [...state.edges, ...incomingEdges],
        baseIds: new Set([...state.baseIds, ...newIds]),
        nodeSubstationSigla,
      };
    }),
  onNodesChange: (changes) =>
    set((state) => {
      // Nó importado (base) pode ser reposicionado/rotacionado mas não removido.
      const filtered = changes.filter((c) => !(c.type === "remove" && state.baseIds.has(c.id)));
      return { nodes: applyNodeChanges(filtered, state.nodes) };
    }),
  onEdgesChange: (changes) =>
    set((state) => {
      const filtered = changes.filter((c) => !(c.type === "remove" && state.baseIds.has(c.id)));
      const edges = applyEdgeChanges(filtered, state.edges);
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
      if (state.baseIds.has(edgeId)) return state;
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
      mode: "MONTAGEM",
      substations: [],
      baseIds: new Set(),
      nodeSubstationSigla: new Map(),
      nodes: [],
      edges: [],
      wireMode: false,
      wirePending: null,
    }),
}));
