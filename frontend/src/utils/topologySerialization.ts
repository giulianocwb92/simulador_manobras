import type { Edge } from "@xyflow/react";
import type { TopologyNode } from "../types/topology";
import type { Topology } from "../types/substation";

/** Converte a topologia serializada (vinda da API) pro formato de nós/arestas do React Flow. */
export function topologyToStore(topology: Topology): { nodes: TopologyNode[]; edges: Edge[] } {
  // dados legados sem position/data (ex: escritos manualmente antes desta versão) são ignorados
  const nodes = topology.nodes.filter(
    (n) => n.position && typeof n.position.x === "number" && n.data !== undefined
  ) as unknown as TopologyNode[];
  const edges: Edge[] = topology.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));
  return { nodes, edges };
}

/** Converte nós/arestas do React Flow pro formato de topologia serializado (API). */
export function storeToTopology(nodes: TopologyNode[], edges: Edge[]): Topology {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type ?? "", position: n.position, data: n.data })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}
