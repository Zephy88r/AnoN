import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PageShell from "./components/PageShell";

import Landing from "./pages/Landing";
import HomeFeed from "./pages/HomeFeed";
import Map from "./pages/Map";
import Trust from "./pages/Trust";
import LinkCards from "./pages/LinkCards";
import ChatThread from "./pages/ChatThread";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import RequireTrust from "./components/RequireTrust";


import { bootstrapSession } from "./services/session"; // ✅ add this

export default function App() {
  useEffect(() => {
    // Bootstraps anon JWT once; safe to call repeatedly (token just refreshes)
    bootstrapSession().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* public */}
        <Route path="/" element={<Landing />} />

        {/* app shell */}
        <Route path="/app" element={<PageShell />}>
          <Route index element={<Navigate to="feed" replace />} />
          <Route path="feed" element={<HomeFeed />} />
          <Route path="map" element={<Map />} />
          <Route path="trust" element={<Trust />} />
          <Route path="link-cards" element={<LinkCards />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:threadId" element={ <RequireTrust> <ChatThread /> </RequireTrust>}/>
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
