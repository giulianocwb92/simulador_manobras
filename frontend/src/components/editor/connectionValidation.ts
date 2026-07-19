import type { Connection } from "@xyflow/react";
import type { TopologyNode } from "../../types/topology";

export interface ConnectionValidationResult {
  ok: boolean;
  message?: string;
}

function tensaoNaConexao(node: TopologyNode, handleId: string | null | undefined): number | undefined {
  if (node.type === "barra") return node.data.tensao;
  if (node.type === "transformador") {
    if (handleId === "terminal-at") return node.data.tensao_at;
    if (handleId === "terminal-bt") return node.data.tensao_bt;
    if (handleId === "terminal-ter") return node.data.tensao_ter;
  }
  return undefined;
}

/** Regras de validação de conexão — ver docs/editor-topology.md. */
export function validateConnection(connection: Connection, nodes: TopologyNode[]): ConnectionValidationResult {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);

  if (!sourceNode || !targetNode) {
    return { ok: false, message: "Conexão inválida" };
  }

  const sourceTensao = tensaoNaConexao(sourceNode, connection.sourceHandle);
  const targetTensao = tensaoNaConexao(targetNode, connection.targetHandle);

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
