import { BrowserRouter, Route, Routes } from "react-router-dom";
import { IdentifyUserGate } from "./components/IdentifyUserGate";
import { SubstationsHomePage } from "./components/SubstationsHomePage";
import { SubstationEditorPage } from "./components/SubstationEditorPage";
import { ManeuverHistoryPage } from "./components/ManeuverHistoryPage";
import { ManeuverDetailPage } from "./components/ManeuverDetailPage";

function App() {
  return (
    <IdentifyUserGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SubstationsHomePage />} />
          <Route path="/substations/:id" element={<SubstationEditorPage />} />
          <Route path="/manobras" element={<ManeuverHistoryPage />} />
          <Route path="/manobras/:id" element={<ManeuverDetailPage />} />
        </Routes>
      </BrowserRouter>
    </IdentifyUserGate>
  );
}

export default App;
