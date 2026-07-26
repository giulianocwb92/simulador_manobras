import type { Connection, Edge } from "@xyflow/react";
import { tensaoDoTerminal, type TopologyNode } from "../../types/topology";

export interface ConnectionValidationResult {
  ok: boolean;
  message?: string;
}

/** Regras de validação de conexão — ver docs/editor-topology.md. */
export function validateConnection(
  connection: Connection,
  nodes: TopologyNode[],
  _edges: Edge[]
): ConnectionValidationResult {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);

  if (!sourceNode || !targetNode) {
    return { ok: false, message: "Conexão inválida" };
  }

  const sourceTensao = tensaoDoTerminal(sourceNode, connection.sourceHandle);
  const targetTensao = tensaoDoTerminal(targetNode, connection.targetHandle);

  if (sourceTensao !== undefined && targetTensao !== undefined && sourceTensao !== targetTensao) {
    return { ok: false, message: "Não é possível conectar barras de tensões diferentes sem transformador" };
  }

  // Bloco Linha: conexão livre — sem restrição de tipo de equipamento ou nível de
  // tensão do outro lado (ex.: CH 29-03 ligada direto na linha, sem barra >=69 kV
  // topologicamente resolvida). Ver pedido do usuário em 2026-07-25.
  return { ok: true };
}
