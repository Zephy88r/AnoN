import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PageShell from "./components/PageShell";

import Landing from "./pages/Landing";
import HomeFeed from "./pages/HomeFeed";
import Map from "./pages/Map";
import Trust from "./pages/Trust";
import LinkCards from "./pages/LinkCards";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route (later: passkey login/create identity) */}
        <Route path="/" element={<Landing />} />

        {/* App routes wrapped in shell */}
        <Route
          path="/app"
          element={
            <PageShell>
              <HomeFeed />
            </PageShell>
          }
        />

        <Route
          path="/feed"
          element={
            <PageShell>
              <HomeFeed />
            </PageShell>
          }
        />
        <Route
          path="/map"
          element={
            <PageShell>
              <Map />
            </PageShell>
          }
        />
        <Route
          path="/trust"
          element={
            <PageShell>
              <Trust />
            </PageShell>
          }
        />
        <Route
          path="/link-cards"
          element={
            <PageShell>
              <LinkCards />
            </PageShell>
          }
        />
        <Route
          path="/messages"
          element={
            <PageShell>
              <Messages />
            </PageShell>
          }
        />
        <Route
          path="/settings"
          element={
            <PageShell>
              <Settings />
            </PageShell>
          }
        />

        {/* Default */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
