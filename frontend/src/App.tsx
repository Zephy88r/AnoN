import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PageShell from "./components/PageShell";
import Landing from "./pages/Landing";
import HomeFeed from "./pages/HomeFeed";
import Map from "./pages/Map";
import Trust from "./pages/Trust";
import LinkCards from "./pages/LinkCards";
import Messages from "./pages/Messages";
import ChatThread from "./pages/ChatThread";
import Settings from "./pages/Settings";

import RequireTrust from "./components/RequireTrust";
import { bootstrapSession } from "./services/session";
import { getSessionToken } from "./services/api";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // If token already exists → done
        if (!getSessionToken()) {
          await bootstrapSession();
        }
      } catch (e) {
        console.error("Session bootstrap failed", e);
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-green-400 font-mono">
        Initializing session…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/app" element={<PageShell />}>
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<HomeFeed />} />
          <Route path="map" element={<Map />} />
          <Route path="trust" element={<Trust />} />
          <Route path="link-cards" element={<LinkCards />} />
          <Route path="messages" element={<Messages />} />
          <Route
            path="messages/:threadId"
            element={
              <RequireTrust>
                <ChatThread />
              </RequireTrust>
            }
          />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
