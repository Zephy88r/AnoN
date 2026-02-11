import { NavLink } from "react-router-dom";
import {
    HomeIcon,
    MapIcon,
    UserGroupIcon,
    LinkIcon,
    ChatBubbleLeftRightIcon,
    Cog6ToothIcon,
    } from "@heroicons/react/24/outline";

    const items = [
    { name: "Feed", to: "/app/feed", icon: HomeIcon },
    { name: "Map", to: "/app/map", icon: MapIcon },
    { name: "Trust", to: "/app/trust", icon: UserGroupIcon },
    { name: "Link Cards", to: "/app/link-cards", icon: LinkIcon },
    { name: "Messages", to: "/app/messages", icon: ChatBubbleLeftRightIcon },
    ];

    export default function Sidebar() {
    return (
        <aside className="border-r border-emerald-500/15 dark:border-green-500/20 bg-white/50 dark:bg-black/45 backdrop-blur-xl p-4">
        <nav className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black">
            {items.map(({ name, to, icon: Icon }) => (
            <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                [
                    "flex items-center gap-3 px-3 py-2 rounded-lg font-mono",
                    "transition-colors",
                    isActive
                    ? "bg-emerald-500/10 dark:bg-green-500/15 text-slate-900 dark:text-green-200 border border-emerald-500/25 dark:border-green-500/30"
                    : "text-slate-700 dark:text-green-300/80 hover:bg-emerald-500/10 dark:hover:bg-green-500/10 hover:text-slate-900 dark:hover:text-green-200"
                ].join(" ")
                }
            >
                <Icon className="h-5 w-5" />
                <span>{name}</span>
            </NavLink>
            ))}
        </nav>

        <div className="mt-6 pt-4 border-t border-green-500/15">
            <NavLink
                to="/app/settings"
                className={({ isActive }) =>
                    [
                    "flex items-center gap-3 px-3 py-2 rounded-lg font-mono transition-all duration-150",
                    // Always readable in LIGHT mode:
                    "text-slate-800 hover:text-slate-950",
                    "hover:bg-emerald-500/10",
                    // DARK mode:
                    "dark:text-green-300/80 dark:hover:text-green-200 dark:hover:bg-green-500/10",
                    // Active:
                    isActive
                        ? " bg-emerald-500/12 border border-emerald-500/25 dark:bg-green-500/15 dark:border-green-500/30"
                        : " border border-transparent",
                    ].join(" ")
                }
                >
            <Cog6ToothIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                <span>Settings</span>
            </NavLink>

        </div>
        </aside>
    );
}
