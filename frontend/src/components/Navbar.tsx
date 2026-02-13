import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
    Cog6ToothIcon,
    MoonIcon,
    SunIcon,
    ComputerDesktopIcon,
    } from "@heroicons/react/24/outline";
import NotificationBell from "./NotificationBell";

interface NavbarProps {
  onNotificationToggle: () => void;
}

export default function Navbar({ onNotificationToggle }: NavbarProps) {
    const { themeMode, setThemeMode } = useTheme();
    const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";
    const navigate = useNavigate();



    return (
        <header className="relative h-16 flex items-center justify-between px-6
                border-b border-emerald-500/20 dark:border-green-500/20
                bg-white/70 dark:bg-black/55 backdrop-blur-xl">

                                                                                    
        {/* Left */}
        <div className="flex items-center gap-3">
            <span className="font-mono text-xl text-emerald-700 dark:text-green-400">
                G-host
            </span>

            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Center */}
            <button
                onClick={() => navigate("/app/feed?search=true")}
                className="hidden md:flex font-mono text-slate-600 dark:text-green-400/70 hover:text-emerald-700 dark:hover:text-green-300 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black rounded-lg px-3 py-1"
            >
                &gt; search network
            </button>


        {/* Right */}
        <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell onToggle={onNotificationToggle} />

            <span className="font-mono text-sm text-slate-700 dark:text-green-300">
                User #XXXXXX
            </span>

            {/* Theme selector */}
            <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-2 py-1">
            <button
                onClick={() => setThemeMode("system")}
                className={`p-1 rounded-lg hover:bg-green-500/10 ${focusRing} ${
                            themeMode === "system"
                        ? "text-slate-900 dark:text-green-300"
                        : "text-slate-700 dark:text-green-300/70"
                }`} 

                title="System"
            >
                <ComputerDesktopIcon className="h-5 w-5" />
            </button>

            <button
                onClick={() => setThemeMode("light")}
                className={`p-1 rounded-lg hover:bg-green-500/10 ${focusRing} ${
                            themeMode === "light"
                        ? "text-slate-900 dark:text-green-300"
                        : "text-slate-700 dark:text-green-300/70"
                }`}

                title="Light"
            >
                <SunIcon className="h-5 w-5" />
            </button>

            <button
                onClick={() => setThemeMode("dark")}
                className={`p-1 rounded-lg hover:bg-green-500/10 ${focusRing} ${
                            themeMode === "dark"
                        ? "text-slate-900 dark:text-green-300"
                        : "text-slate-700 dark:text-green-300/70"
                }`}

                title="Dark"
            >
                <MoonIcon className="h-5 w-5" />
            </button>
            </div>

            <button
            onClick={() => navigate("/app/settings")}
                className={`rounded-lg p-1 hover:bg-emerald-500/10 ${focusRing}
                            text-slate-700 dark:text-green-400`}
                aria-label="Settings"
            >
                <Cog6ToothIcon className="h-5 w-5" />
            </button>


        </div>
        </header>
    );
}
