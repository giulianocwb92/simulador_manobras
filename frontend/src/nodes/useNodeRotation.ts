import { useEffect, type CSSProperties } from "react";
import { useUpdateNodeInternals } from "@xyflow/react";
import type { Rotation } from "../types/topology";

/**
 * Gira visualmente o wrapper que contém o símbolo SVG + os Handles de um nó.
 * Como os Handles ficam dentro do wrapper rotacionado, o React Flow mede a
 * posição real (pós-transform) deles no DOM — não é preciso trocar o
 * `Position` de cada Handle manualmente para cada ângulo.
 */
export function useNodeRotation(id: string, rotation: Rotation = 0) {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, rotation, updateNodeInternals]);

  const wrapperStyle: CSSProperties = {
    transform: `rotate(${rotation}deg)`,
  };

  return { wrapperStyle };
}
