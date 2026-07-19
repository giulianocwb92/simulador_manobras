import { BrowserRouter, Route, Routes } from "react-router-dom";
import { IdentifyUserGate } from "./components/IdentifyUserGate";
import { SubstationsHomePage } from "./components/SubstationsHomePage";
import { SubstationEditorPage } from "./components/SubstationEditorPage";

function App() {
  return (
    <IdentifyUserGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SubstationsHomePage />} />
          <Route path="/substations/:id" element={<SubstationEditorPage />} />
        </Routes>
      </BrowserRouter>
    </IdentifyUserGate>
  );
}

export default App;
