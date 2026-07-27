import type { Edge } from "@xyflow/react";
import type { BarraData, TopologyNode } from "../types/topology";

/**
 * Remove das barras os handles dinâmicos (criados via addBarHandle) que não têm
 * mais nenhuma aresta ligada — evita handle "fantasma" (e barra que não encolhe)
 * depois que o wire que o criou é apagado. Usado tanto por `editorStore` quanto
 * por `sessionStore`.
 */
export function pruneUnusedBarHandles(nodes: TopologyNode[], edges: Edge[]): TopologyNode[] {
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
