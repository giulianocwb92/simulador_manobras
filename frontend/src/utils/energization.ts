import type { Edge } from "@xyflow/react";
import { tensaoDoTerminal, type TopologyNode, type VoltageLevel } from "../types/topology";

/** Chave única de um terminal (nó + handle) usada nos mapas de propagação. */
export function portKey(nodeId: string | null | undefined, handle: string | null | undefined): string {
  return `${nodeId ?? ""}::${handle ?? ""}`;
}

interface VoltageMapOptions {
  /**
   * Se true (padrão), DJ/CH/Religador só propagam tensão entre os terminais
   * quando `estado === "fechado"` — usado para colorir os wires pela energização
   * real do diagrama (Correção: wire cinza depois de um equipamento aberto).
   * Se false, propaga sempre — usado para resolver topologicamente a que barra
   * um equipamento está ligado, independente do estado atual (ex.: validação do
   * bloco Linha).
   */
  respectSwitchState?: boolean;
  /**
   * Se true, barras do tipo "transferencia" também iniciam propagação. Por padrão
   * (false) elas só recebem cor quando alcançadas por um caminho fechado — ver
   * comentário em BarraNode.tsx.
   */
  seedTransferBarras?: boolean;
}

/**
 * Propaga a tensão de cada barra pelo grafo de equipamentos conectados,
 * retornando um mapa terminal → nível de tensão alcançado.
 */
export function computeVoltageMap(
  nodes: TopologyNode[],
  edges: Edge[],
  { respectSwitchState = true, seedTransferBarras = false }: VoltageMapOptions = {}
): Map<string, VoltageLevel> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();

  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push(b);
    adjacency.get(b)!.push(a);
  };

  // Liga unidirecionalmente (from → to); usado pelo TF/TF3 pra impedir que a
  // cor flua BT → AT por padrão (ver directedLink abaixo).
  const linkDirected = (from: string, to: string) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    if (!adjacency.has(to)) adjacency.set(to, []);
    adjacency.get(from)!.push(to);
  };

  // Ligações internas de cada equipamento (o que conduz para o quê dentro do próprio nó).
  for (const node of nodes) {
    switch (node.type) {
      case "barra": {
        const handles = node.data.handles ?? [];
        for (let i = 0; i < handles.length; i++) {
          for (let j = i + 1; j < handles.length; j++) {
            link(portKey(node.id, handles[i].id), portKey(node.id, handles[j].id));
          }
        }
        break;
      }
      case "transformador": {
        // Por padrão a cor só flui AT → BT (o TF não propaga de volta pro lado
        // de alta) — "Permitir propagação reversa (BT → AT)" no modal libera
        // os dois sentidos só para este transformador específico.
        const a = portKey(node.id, "terminal-a");
        const b = portKey(node.id, "terminal-b");
        linkDirected(a, b);
        if (node.data.propagacaoReversa) linkDirected(b, a);
        break;
      }
      case "tf3": {
        const a = portKey(node.id, "terminal-a");
        const b = portKey(node.id, "terminal-b");
        const ter = portKey(node.id, "terminal-ter");
        linkDirected(a, b);
        linkDirected(a, ter);
        if (node.data.propagacaoReversa) {
          linkDirected(b, a);
          linkDirected(ter, a);
        }
        break;
      }
      case "disjuntor":
      case "chave":
      case "religador":
      case "chave_provisoria":
        if (!respectSwitchState || node.data.estado === "fechado") {
          link(portKey(node.id, "terminal-a"), portKey(node.id, "terminal-b"));
        }
        break;
      case "jumper":
        // Jumper é uma conexão elétrica direta (sem estado aberto/fechado) — sempre conduz.
        link(portKey(node.id, "terminal-a"), portKey(node.id, "terminal-b"));
        break;
      default:
        break;
    }
  }

  // Ligações externas (os wires do diagrama).
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    link(portKey(edge.source, edge.sourceHandle), portKey(edge.target, edge.targetHandle));
  }

  const voltageOf = new Map<string, VoltageLevel>();
  const queue: string[] = [];

  for (const node of nodes) {
    if (node.type !== "barra") continue;
    // Só barras com `fonte: true` semeiam o BFS — nenhuma barra colore por
    // padrão, mesmo de baixa tensão (ver domain-model/editor-topology, Correção FRENTE 1).
    if (!node.data.fonte) continue;
    if (node.data.tipo === "transferencia" && !seedTransferBarras) continue;
    for (const handle of node.data.handles ?? []) {
      const key = portKey(node.id, handle.id);
      voltageOf.set(key, node.data.tensao);
      queue.push(key);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentVoltage = voltageOf.get(current)!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (voltageOf.has(neighbor)) continue;
      const separatorIndex = neighbor.indexOf("::");
      const neighborNodeId = neighbor.slice(0, separatorIndex);
      const neighborHandle = neighbor.slice(separatorIndex + 2) || null;
      const neighborNode = nodeById.get(neighborNodeId);
      const ownVoltage = tensaoDoTerminal(neighborNode, neighborHandle);
      voltageOf.set(neighbor, ownVoltage ?? currentVoltage);
      queue.push(neighbor);
    }
  }

  return voltageOf;
}
