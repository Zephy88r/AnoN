import { Outlet } from "react-router-dom";
import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import UtilityPanel from "./UtilityPanel";
import NotificationPanel from "./NotificationPanel";
import bgDark from "../assets/background-dark.png";
import bgLight from "../assets/background-light.png";


export default function PageShell() {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    return (
        <div
    className="relative h-screen text-slate-900 dark:text-green-100 isolation-isolate"
    style={{
        backgroundImage: `url(${bgLight})`,
    }}
    >
    {/* Dark mode background */}
    <div
        className="absolute inset-0 hidden dark:block"
        style={{
        backgroundImage: `url(${bgDark})`,
        }}
    />

    {/* Overlay for readability - NO backdrop-blur to prevent flicker */}
    <div className="absolute inset-0 bg-white/60 dark:bg-black/60" />

    {/* App content */}
    <div className="relative z-10 h-full">
        <Navbar onNotificationToggle={() => setIsNotificationOpen(!isNotificationOpen)} />

        <div className="grid grid-cols-[240px_1fr_280px] h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="overflow-y-auto p-6 md:p-8">
            <Outlet />
        </main>
        <UtilityPanel />
        </div>
    </div>

    {/* Notification Panel */}
    <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
    />
    </div>

    );
}
