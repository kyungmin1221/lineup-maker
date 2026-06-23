import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import EntryPage from "./pages/EntryPage";
import MyLineupsPage from "./pages/MyLineupsPage";
import CreatePage from "./pages/CreatePage";
import ViewPage from "./pages/ViewPage";
import { trackPageView } from "./lib/analytics";
import "./index.css";

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/my" element={<MyLineupsPage />} />
        <Route path="/edit/:id" element={<CreatePage />} />
        <Route path="/view/:id" element={<ViewPage />} />
      </Routes>
    </BrowserRouter>
  );
}
