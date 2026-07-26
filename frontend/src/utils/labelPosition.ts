import type { CSSProperties } from "react";
import type { Rotation } from "../types/topology";

/** Posição do label fora do símbolo, sempre horizontal e legível, conforme a rotação do componente. */
export function getLabelPosition(rotation: Rotation = 0): CSSProperties {
  switch (rotation) {
    case 90:
      return { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 4 };
    case 180:
      return { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4 };
    case 270:
      return { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 4 };
    default:
      return { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4 };
  }
}
