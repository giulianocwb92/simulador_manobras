import { useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { WirePending } from "../../stores/topologyBindings";

/** Linha ortogonal (estilo LTSpice) que segue o cursor enquanto um wire está sendo desenhado. */
export function WirePreview({ wirePending }: { wirePending: WirePending | null }) {
  const { flowToScreenPosition } = useReactFlow();
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!wirePending) {
      setMouse(null);
      return;
    }
    function handleMouseMove(event: MouseEvent) {
      setMouse({ x: event.clientX, y: event.clientY });
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [wirePending]);

  if (!wirePending || !mouse) return null;

  const start = flowToScreenPosition(wirePending.sourcePosition);
  const midX = start.x + (mouse.x - start.x) / 2;

  return (
    <svg className="pointer-events-none fixed inset-0 z-50 h-full w-full">
      <path
        d={`M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${mouse.y} L ${mouse.x} ${mouse.y}`}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      <circle cx={start.x} cy={start.y} r={4} fill="#2563eb" />
    </svg>
  );
}
