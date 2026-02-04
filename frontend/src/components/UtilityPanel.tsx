import { useLocation } from "react-router-dom";

export default function UtilityPanel() {
    const location = useLocation();

    const path = location.pathname;

    const isFeed = path.startsWith("/app/feed");
    const isTrust = path.startsWith("/app/trust");
    const isMap = path.startsWith("/app/map");
    const isSettings = path.startsWith("/app/settings");

    return (
        <aside className="border-l border-emerald-500/15 dark:border-green-500/20 bg-white/50 dark:bg-black/45 backdrop-blur-xl p-4 space-y-4">
        {isFeed && <FeedUtility />}
        {isTrust && <TrustUtility />}
        {isMap && <MapUtility />}
        {isSettings && <SettingsUtility />}
        </aside>
    );
}

/* ---------- Shared Card Style ---------- */
const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 p-3";

/* ---------- Feed ---------- */
function FeedUtility() {
    return (
        <>
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Network
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            Region: NEPAL
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Mode: Ghost
            </div>
        </div>

        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Posting Limits
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            Posts left: 3
            </div>
        </div>
        </>
    );
}

/* ---------- Trust ---------- */
function TrustUtility() {
    return (
        <>
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Trust Status
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            Level: <span className="font-mono">NEW</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Post limit: 3/day
            </div>
        </div>

        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Invite Code
            </div>
            <div className="font-mono text-lg text-slate-900 dark:text-green-100">
            7F3K-91QZ
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Share privately
            </div>
        </div>

        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Pending Requests
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            2 awaiting action
            </div>
        </div>
        </>
    );
}

/* ---------- Map ---------- */
function MapUtility() {
    return (
        <>
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Map Visibility
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            Ghost Mode: ON
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Location hidden
            </div>
        </div>

        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Region Activity
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            14 active ghosts
            </div>
        </div>
        </>
    );
}

/* ---------- Settings ---------- */
function SettingsUtility() {
    return (
        <>
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Appearance
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            Theme: System
            </div>
        </div>

        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Privacy
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            Ghost Mode: ON
            </div>
        </div>

        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            Identity
            </div>
            <div className="text-sm text-slate-800 dark:text-green-200">
            Anonymous ID
            </div>
        </div>
        </>
    );
}
