import { BrowserRouter, Route, Routes } from "react-router-dom";
import { IdentifyUserGate } from "./components/IdentifyUserGate";
import { HomePage } from "./components/HomePage";
import { SubstationsHomePage } from "./components/SubstationsHomePage";
import { SubstationEditorPage } from "./components/SubstationEditorPage";
import { ManeuverHistoryPage } from "./components/ManeuverHistoryPage";
import { ManeuverSessionPage } from "./components/ManeuverSessionPage";
import { ManeuverDetailPage } from "./components/ManeuverDetailPage";
import { ManeuverEditPage } from "./components/ManeuverEditPage";
import { ManeuverPdfPage } from "./components/ManeuverPdfPage";

function App() {
  return (
    <IdentifyUserGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/substations" element={<SubstationsHomePage />} />
          <Route path="/substations/:id" element={<SubstationEditorPage />} />
          <Route path="/manobras" element={<ManeuverHistoryPage />} />
          <Route path="/manobras/nova" element={<ManeuverSessionPage />} />
          <Route path="/manobras/:id" element={<ManeuverDetailPage />} />
          <Route path="/manobras/:id/editar" element={<ManeuverEditPage />} />
          <Route path="/manobras/:id/pdf" element={<ManeuverPdfPage />} />
        </Routes>
      </BrowserRouter>
    </IdentifyUserGate>
  );
}

export default App;
