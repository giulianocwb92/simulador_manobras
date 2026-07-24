import { useEdges } from "@xyflow/react";

/**
 * Handles dinâmicos de uma barra: cria sempre pelo menos 3 pontos de conexão
 * e cresce conforme novas arestas são conectadas.
 */
export function useBusHandles(nodeId: string) {
  const edges = useEdges();
  const connectionCount = edges.filter(
    (e) =>
      (e.source === nodeId && e.sourceHandle?.startsWith("terminal-")) ||
      (e.target === nodeId && e.targetHandle?.startsWith("terminal-"))
  ).length;
  const handleCount = Math.max(3, connectionCount + 1);

  return {
    handleCount,
    handleIds: Array.from({ length: handleCount }, (_, i) => `terminal-${i}`),
  };
}
