import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreatePage from "./pages/CreatePage";
import ViewPage from "./pages/ViewPage";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreatePage />} />
        <Route path="/view/:id" element={<ViewPage />} />
      </Routes>
    </BrowserRouter>
  );
}
