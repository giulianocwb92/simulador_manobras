import { BarraNode } from "./BarraNode";
import { CHNode } from "./CHNode";
import { DJNode } from "./DJNode";
import { LinhaNode } from "./LinhaNode";
import { ReligadorNode } from "./ReligadorNode";
import { TCNode } from "./TCNode";
import { TFNode } from "./TFNode";
import { TPNode } from "./TPNode";

export const nodeTypes = {
  barra: BarraNode,
  disjuntor: DJNode,
  chave: CHNode,
  transformador: TFNode,
  religador: ReligadorNode,
  tp: TPNode,
  tc: TCNode,
  linha: LinhaNode,
};
