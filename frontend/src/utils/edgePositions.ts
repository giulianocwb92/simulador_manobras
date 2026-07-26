import { Position } from "@xyflow/react";
import type { EquipmentKind, Rotation } from "../types/topology";

const CLOCKWISE: Position[] = [Position.Left, Position.Top, Position.Right, Position.Bottom];

/** Gira uma posição base em incrementos de 90° no sentido horário. */
export function rotatePosition(base: Position, rotation: Rotation = 0): Position {
  const steps = (rotation / 90) % CLOCKWISE.length;
  const idx = (CLOCKWISE.indexOf(base) + steps) % CLOCKWISE.length;
  return CLOCKWISE[idx];
}

type TerminalBaseMap = Partial<Record<string, Position>>;

// Posição de cada terminal na rotação 0° (ver tabela da Correção 5).
const TERMINAL_BASE_POSITIONS: Partial<Record<EquipmentKind, TerminalBaseMap>> = {
  disjuntor: { "terminal-a": Position.Left, "terminal-b": Position.Right },
  chave: { "terminal-a": Position.Left, "terminal-b": Position.Right },
  religador: { "terminal-a": Position.Left, "terminal-b": Position.Right },
  transformador: { "terminal-a": Position.Left, "terminal-b": Position.Right },
  tf3: { "terminal-a": Position.Left, "terminal-b": Position.Right, "terminal-ter": Position.Bottom },
  tc: { "terminal-a": Position.Left, "terminal-b": Position.Right },
  tp: { "terminal-a": Position.Top },
};

/** Posição de um terminal fixo (terminal-a/b/ter), considerando a rotação atual do componente. */
export function getTerminalPosition(kind: EquipmentKind, terminalId: string, rotation: Rotation = 0): Position {
  const base = TERMINAL_BASE_POSITIONS[kind]?.[terminalId] ?? Position.Left;
  return rotatePosition(base, rotation);
}

/**
 * Posição de saída dos handles dinâmicos de uma barra. Na rotação 0°/180° a
 * barra é vertical (handles saem pela direita); em 90°/270° é horizontal
 * (handles saem pela base).
 */
export function getBarraHandlePosition(rotation: Rotation = 0): Position {
  return rotation === 90 || rotation === 270 ? Position.Bottom : Position.Right;
}
