import type { Edge } from "@xyflow/react";
import { PROVISIONAL_KINDS, type EquipmentKind, type TopologyNode } from "../types/topology";

/**
 * Ao finalizar a manobra, elementos provisórios com `permanente: true` são
 * incorporados à topologia base da SE; os temporários (`permanente: false`)
 * nunca a alteram — ver docs/domain-model.md "Elementos provisórios". Aqui só
 * filtra os nós/edges que devem ser persistidos; não mexe no estado local do
 * canvas (os temporários continuam visíveis até a página recarregar).
 */
export function incorporatePermanentProvisionals(
  nodes: TopologyNode[],
  edges: Edge[]
): { nodes: TopologyNode[]; edges: Edge[] } {
  const temporaryIds = new Set(
    nodes
      .filter(
        (node) =>
          PROVISIONAL_KINDS.has(node.type as EquipmentKind) &&
          !(node.data as { permanente?: boolean }).permanente
      )
      .map((node) => node.id)
  );
  if (temporaryIds.size === 0) return { nodes, edges };
  return {
    nodes: nodes.filter((node) => !temporaryIds.has(node.id)),
    edges: edges.filter((edge) => !temporaryIds.has(edge.source) && !temporaryIds.has(edge.target)),
  };
}
