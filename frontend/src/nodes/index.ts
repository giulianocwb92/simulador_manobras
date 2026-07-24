import { BarraNode } from "./BarraNode";
import { CHNode } from "./CHNode";
import { DJNode } from "./DJNode";
import { LinhaNode } from "./LinhaNode";
import { ReligadorNode } from "./ReligadorNode";
import { TCNode } from "./TCNode";
import { TF3Node } from "./TF3Node";
import { TFNode } from "./TFNode";
import { TPNode } from "./TPNode";

export const nodeTypes = {
  barra: BarraNode,
  disjuntor: DJNode,
  chave: CHNode,
  transformador: TFNode,
  tf3: TF3Node,
  religador: ReligadorNode,
  tp: TPNode,
  tc: TCNode,
  linha: LinhaNode,
};
