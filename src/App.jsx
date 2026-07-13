import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { trackPageView } from "./lib/analytics";
import "./index.css";

const EntryPage = lazy(() => import("./pages/EntryPage"));
const MyLineupsPage = lazy(() => import("./pages/MyLineupsPage"));
const CreatePage = lazy(() => import("./pages/CreatePage"));
const ViewPage = lazy(() => import("./pages/ViewPage"));
const LockerRoomPage = lazy(() => import("./pages/LockerRoomPage"));

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
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/my" element={<MyLineupsPage />} />
          <Route path="/edit/:id" element={<CreatePage />} />
          <Route path="/view/:id" element={<ViewPage />} />
          <Route path="/locker-room/:id" element={<LockerRoomPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
