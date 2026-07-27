import { useParams } from "react-router-dom";
import { maneuversService } from "../services/maneuvers";

/** Página dedicada só pra embutir o PDF num <iframe> em tela cheia — o
 *  endpoint devolve `Content-Disposition: inline`, então o navegador
 *  renderiza o PDF direto, sem forçar download. */
export function ManeuverPdfPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;

  return (
    <iframe
      src={maneuversService.pdfUrl(id)}
      title="PDF da manobra"
      className="h-screen w-screen border-0"
    />
  );
}
