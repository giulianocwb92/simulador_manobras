import { useEffect, type CSSProperties } from "react";
import { useUpdateNodeInternals } from "@xyflow/react";
import type { Rotation } from "../types/topology";

/**
 * Gira visualmente o símbolo SVG de um nó em incrementos de 90°.
 *
 * Os Handles ficam FORA do wrapper rotacionado (irmãos dele, não filhos) e são
 * posicionados pelo React Flow relativo à caixa do container externo — não ao
 * SVG rotacionado. Por isso o container precisa trocar largura/altura em
 * 90°/270° (mesma ideia já usada em BarraNode.tsx): sem isso, o container
 * continua com o tamanho "deitado" original enquanto o símbolo gira e passa a
 * ocupar visualmente uma pegada "em pé" — o Handle fica preso na borda antiga
 * (a caixa não rotacionada) enquanto o terminal visual do símbolo termina até
 * ~(largura-altura)/2 px além dela, e o wire liga num ponto que não é onde o
 * terminal realmente está, criando cotovelos residuais no wire.
 */
export function useNodeRotation(id: string, rotation: Rotation = 0, baseWidth?: number, baseHeight?: number) {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, rotation, updateNodeInternals]);

  const isSideways = rotation === 90 || rotation === 270;

  // Caixa do container: troca largura/altura em 90°/270° pra acompanhar a
  // pegada visual real do símbolo rotacionado — é contra essa caixa que o
  // React Flow posiciona os Handles.
  const containerStyle: CSSProperties = {
    width: isSideways ? baseHeight : baseWidth,
    height: isSideways ? baseWidth : baseHeight,
  };

  // O wrapper mantém o tamanho nativo do SVG (não rotacionado) e é centralizado
  // no container (via flex, no componente) — assim o `rotate()` gira em torno
  // do mesmo centro do container em qualquer ângulo. `flexShrink: 0` é
  // necessário porque em 90°/270° o container fica menor que o wrapper num
  // dos eixos (containerStyle troca largura/altura, mas o wrapper não) — sem
  // isso o flexbox encolhe o wrapper (e o SVG dentro dele) pra caber, fazendo
  // o símbolo aparecer menor quando rotacionado.
  const wrapperStyle: CSSProperties = {
    width: baseWidth,
    height: baseHeight,
    flexShrink: 0,
    transform: `rotate(${rotation}deg)`,
  };

  return { containerStyle, wrapperStyle };
}
