/**
 * Grid do editor. 10px (o valor "óbvio") não divide os 12px de offset do
 * terminal vertical dos componentes de 24px de altura (DJ/CH/TF/TC/Religador/
 * TF3 — todos com o handle no meio da caixa, ver useNodeRotation.ts e cada
 * *Node.tsx). Como o posicionamento de nó é sempre arredondado pro grid, um
 * componente encostado numa barra nunca cai exatamente na mesma linha do
 * handle da barra com grid=10 — sobra sempre ~2px de erro, e o wire (tipo
 * "step", só ortogonal) desenha esse resto como um pequeno cotovelo extra.
 * 6 divide 12 exatamente, então componente e barra alinham de verdade.
 */
export const GRID = 6;

// Comprimento mínimo da barra, mesmo sem nenhum circuito conectado.
export const BARRA_MIN_LENGTH = 400;
// Espaço reservado por circuito conectado, pra caber 10+ sem apertar.
const HANDLE_SPACING = 30;

/** Barra cresce conforme ganha circuitos, sem nunca ficar menor que o mínimo. */
export function computeBarraLength(handleCount: number): number {
  const needed = Math.ceil((handleCount * HANDLE_SPACING) / GRID) * GRID;
  return Math.max(BARRA_MIN_LENGTH, needed);
}
