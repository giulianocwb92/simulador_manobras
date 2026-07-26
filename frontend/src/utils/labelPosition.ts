import type { CSSProperties } from "react";

/**
 * Posição única do label: sempre acima do símbolo, texto horizontal, igual pra
 * todo componente independente da rotação. Antes a posição mudava conforme a
 * rotação (embaixo/direita/acima/esquerda) pra nunca sobrepor o símbolo — mas o
 * resultado visual numa SE com componentes em rotações diferentes ficava sem
 * padrão (uns acima, outros abaixo). A caixa de cada símbolo não redimensiona ao
 * rotacionar (só o SVG interno gira via transform), então o pior overflow visual
 * em 90°/270° é (lado maior - lado menor) / 2 — até 15px pro TPNode (caixa
 * 24x54, o mais desproporcional); 16px de margem cobre esse caso com folga.
 */
export const LABEL_POSITION: CSSProperties = {
  bottom: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  marginBottom: 16,
};
