
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Copilot from "./pages/Copilot";
import Compliance from "./pages/Compliance";
import RCA from "./pages/RCA";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Lessons from "./pages/Lessons";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">

        <Sidebar />

        <div className="main-content">

          <Navbar />

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/documents"
              element={<Documents />}
            />

            <Route
              path="/copilot"
              element={<Copilot />}
            />

            <Route
              path="/compliance"
              element={<Compliance />}
            />

            <Route
              path="/rca"
              element={<RCA />}
            />

            <Route
              path="/graph"
              element={<KnowledgeGraph />}
            />

            <Route
              path="/lessons"
              element={<Lessons />}
            />

          </Routes>

        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

