import type { VoltageLevel } from "../types/topology";

export const VOLTAGE_COLORS: Record<VoltageLevel, string> = {
  230: "#EA580C",
  138: "#DC2626",
  88: "#7C3AED",
  69: "#1D4ED8",
  34.5: "#15803D",
  13.8: "#0284C7",
};

export const WIRE_UNCONNECTED_COLOR = "#FFFFFF";
export const WIRE_UNCONNECTED_STROKE = "#94a3b8";
