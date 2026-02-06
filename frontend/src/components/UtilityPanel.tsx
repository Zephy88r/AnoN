import { useLocation } from "react-router-dom";
import { useTrust } from "../contexts/TrustContext";
import { useTheme } from "../contexts/ThemeContext";
import { useGeoPings } from "../hooks/useGeoPings";


export default function UtilityPanel() {
    const { pathname } = useLocation();

    return (
        <aside className="border-l border-emerald-500/15 dark:border-green-500/20 bg-white/50 dark:bg-black/45 backdrop-blur-xl p-4 space-y-4">
        {pathname.startsWith("/app/feed") && <FeedUtility />}
        {pathname.startsWith("/app/trust") && <TrustUtility />}
        {pathname.startsWith("/app/map") && <MapUtility />}
        {pathname.startsWith("/app/settings") && <SettingsUtility />}
        </aside>
    );
    }


    const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 p-3";

    function UtilityCard({
    title,
    children,
    }: {
    title: string;
    children: React.ReactNode;
    }) {
    return (
        <div className={card}>
        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
            {title}
        </div>
        {children}
        </div>
    );
    }

    function Pill({ label }: { label: string }) {
    return (
        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-mono border border-emerald-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-200">
        {label}
        </span>
    );
    }


    function FeedUtility() {
    return (
        <>
        <UtilityCard title="Network">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Region: <span className="font-mono">NEPAL</span>
            </div>
            <div className="mt-1">
            <Pill label="Ghost Mode" />
            </div>
        </UtilityCard>

        <UtilityCard title="Posting Limits">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Posts left today
            </div>
            <div className="mt-1 font-mono text-lg text-emerald-700 dark:text-green-300">
            3
            </div>
        </UtilityCard>
        </>
    );
    }

    function TrustUtility() {
    const { requests } = useTrust();

    const pending = requests.filter((r) => r.status === "pending").length;
    const accepted = requests.filter((r) => r.status === "accepted").length;

    const level =
        accepted >= 5 ? "ESTABLISHED" : accepted >= 1 ? "KNOWN" : "NEW";

    return (
        <>
        <UtilityCard title="Trust Level">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Level: <span className="font-mono">{level}</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Based on accepted connections
            </div>
        </UtilityCard>

        <UtilityCard title="Pending Requests">
            {pending > 0 ? (
            <div className="text-sm text-emerald-700 dark:text-green-300">
                {pending} awaiting action
            </div>
            ) : (
            <div className="text-sm text-slate-600 dark:text-green-300/60">
                None pending
            </div>
            )}
        </UtilityCard>
        </>
    );
    }

    function MapUtility() {
    const ghostMode = true; // UI mirror (map owns real toggle)
    const region = "NEPAL • BAGMATI";

    const { geoState, pings } = useGeoPings({
        region,
        mode: ghostMode ? "ghost" : "reveal",
        enabled: false, // utility panel = read-only
    });

    return (
        <>
        <UtilityCard title="Map Visibility">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Mode: <span className="font-mono">{ghostMode ? "GHOST" : "REVEAL"}</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Location concealed
            </div>
        </UtilityCard>

        <UtilityCard title="Region Activity">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Active ghosts: <span className="font-mono">{pings.length}</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Geo: {geoState.status}
            </div>
        </UtilityCard>
        </>
    );
    }

    function SettingsUtility() {
    const { theme } = useTheme();

    return (
        <>
        <UtilityCard title="Appearance">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Theme: <span className="font-mono">{theme}</span>
            </div>
        </UtilityCard>

        <UtilityCard title="Privacy">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Ghost Mode: <span className="font-mono">ON</span>
            </div>
        </UtilityCard>

        <UtilityCard title="Identity">
            <div className="text-sm text-slate-800 dark:text-green-200">
            Anonymous
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            No profile • No history
            </div>
        </UtilityCard>
        </>
    );
}
