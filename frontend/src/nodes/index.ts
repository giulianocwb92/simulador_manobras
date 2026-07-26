import { BarraNode } from "./BarraNode";
import { ChaveProvisoriaNode } from "./ChaveProvisoriaNode";
import { CHNode } from "./CHNode";
import { DJNode } from "./DJNode";
import { JumperNode } from "./JumperNode";
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
  jumper: JumperNode,
  chave_provisoria: ChaveProvisoriaNode,
};
