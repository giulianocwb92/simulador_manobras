import type { Connection } from "@xyflow/react";
import { tensaoDoTerminal, type TopologyNode } from "../../types/topology";

export interface ConnectionValidationResult {
  ok: boolean;
  message?: string;
}

/** Regras de validação de conexão — ver docs/editor-topology.md. */
export function validateConnection(connection: Connection, nodes: TopologyNode[]): ConnectionValidationResult {
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

  const linhaNode = sourceNode.type === "linha" ? sourceNode : targetNode.type === "linha" ? targetNode : null;
  if (linhaNode) {
    const outroNode = linhaNode === sourceNode ? targetNode : sourceNode;
    if (outroNode.type !== "barra" || outroNode.data.tensao < 69) {
      return { ok: false, message: "Bloco Linha só pode ser conectado em barras de 69 kV ou superior" };
    }
  }

  return { ok: true };
}
