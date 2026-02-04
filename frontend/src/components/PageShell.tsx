import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import UtilityPanel from "./UtilityPanel";
import bgDark from "../assets/background-dark.png";
import bgLight from "../assets/background-light.png";


export default function PageShell() {
    return (
        <div
    className="relative h-screen text-slate-900 dark:text-green-100"
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

    {/* Overlay for readability */}
    <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px]" />

    {/* App content */}
    <div className="relative z-10 h-full">
        <Navbar />

        <div className="grid grid-cols-[240px_1fr_280px] h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="overflow-y-auto p-6 md:p-8">
            <Outlet />
        </main>
        <UtilityPanel />
        </div>
    </div>
    </div>

    );
}
