import { useEffect } from "react";

interface EditorShortcutsBindings {
  rotateSelectedNodes: () => void;
  wireMode: boolean;
  setWireMode: (active: boolean) => void;
}

/**
 * Atalhos globais do editor de topologia: Ctrl+R (rotacionar), W (ferramenta wire),
 * Esc (sair do modo wire). Delete/Backspace não são tratados aqui — ficam a cargo do
 * `deleteKeyCode` do React Flow, que apaga o wire selecionado sem sair da ferramenta.
 */
export function useEditorShortcuts(
  enabled: boolean,
  { rotateSelectedNodes, wireMode, setWireMode }: EditorShortcutsBindings
) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (event.ctrlKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        rotateSelectedNodes();
        return;
      }

      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        setWireMode(!wireMode);
        return;
      }

      if (wireMode && event.key === "Escape") {
        event.preventDefault();
        setWireMode(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, rotateSelectedNodes, wireMode, setWireMode]);
}
