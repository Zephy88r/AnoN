import { useMemo, useState } from "react";
import {
    MapPinIcon,
    EyeSlashIcon,
    EyeIcon,
    GlobeAltIcon,
    SignalIcon,
} from "@heroicons/react/24/outline";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

export default function Map() {
    // UI-only state
    const [ghostMode, setGhostMode] = useState(true);
    const [region, setRegion] = useState("NEPAL • BAGMATI");

  // UI-only stats
    const activity = useMemo(() => {
    // pretend: activity changes based on ghostMode/region
    const base = ghostMode ? 14 : 22;
    return {
        active: base,
        pulses: ghostMode ? "low" : "medium",
        updated: "just now",
    };
    }, [ghostMode, region]);

    return (
        <div className="mx-auto w-full max-w-5xl space-y-4">
        {/* Header */}
        <div className={`${card} p-4 flex items-start justify-between gap-4`}>
            <div className="flex items-start gap-3">
            <GlobeAltIcon className="h-6 w-6 text-emerald-700 dark:text-green-300 mt-0.5" />
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Map
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                Presence map — no pins, no profiles, only density.
                </p>
            </div>
            </div>

            {/* Ghost badge */}
            <div
            className={`rounded-full px-3 py-1 font-mono text-sm border
                ${
                ghostMode
                    ? "border-emerald-600/30 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200"
                    : "border-slate-300 dark:border-green-500/15 bg-white/60 dark:bg-black/25 text-slate-700 dark:text-green-300/70"
                }`}
            >
            {ghostMode ? "Ghost Mode: ON" : "Ghost Mode: OFF"}
            </div>
        </div>

        {/* Map canvas + overlay controls */}
        <div className={`${card} relative overflow-hidden`} style={{ height: "70vh" }}>
            {/* Fake map background (safe placeholder) */}
            <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 dark:from-green-500/10 dark:to-green-500/5" />
            <div className="absolute inset-0 opacity-60 dark:opacity-70 mix-blend-multiply dark:mix-blend-screen">
                {/* grid */}
                <div
                className="h-full w-full"
                style={{
                    backgroundImage:
                    "linear-gradient(to right, rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.12) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
                />
            </div>

            {/* soft “heat pulses” placeholder */}
            <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/15 dark:bg-green-500/12 blur-3xl" />
            <div className="absolute top-1/3 left-1/2 h-96 w-96 rounded-full bg-emerald-500/12 dark:bg-green-500/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/10 dark:bg-green-500/10 blur-3xl" />
            </div>

            {/* Center marker (not a user pin; just “region focus”) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2">
                <div className="relative">
                <div className="h-20 w-20 rounded-full border border-emerald-500/25 dark:border-green-500/25 bg-white/30 dark:bg-black/20 backdrop-blur" />
                <div className="absolute inset-0 m-auto h-3.5 w-3.5 rounded-full bg-emerald-600 dark:bg-green-400" />
                <div className="absolute inset-0 m-auto h-10 w-10 rounded-full border border-emerald-500/20 dark:border-green-500/20 animate-pulse" />
                </div>
                <div className="font-mono text-xs text-slate-700 dark:text-green-300/70">
                region focus
                </div>
            </div>
            </div>

            {/* Top-left overlay controls */}
            <div className="absolute top-4 left-4 w-[320px] space-y-3">
            {/* Region */}
            <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-3">
                <div className="flex items-center gap-2 mb-2">
                <MapPinIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
                    Region (manual)
                </div>
                </div>

                <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={`w-full rounded-xl border border-emerald-500/20 dark:border-green-500/20
                    bg-white/60 dark:bg-black/40 px-3 py-2 font-mono text-sm
                    text-slate-900 dark:text-green-100 ${focusRing}`}
                >
                <option>NEPAL • BAGMATI</option>
                <option>NEPAL • KOSHI</option>
                <option>NEPAL • GANDAKI</option>
                <option>GLOBAL • PUBLIC</option>
                </select>

                <div className="mt-2 text-xs text-slate-600 dark:text-green-300/70">
                No precise location stored. Region only.
                </div>
            </div>

            {/* Visibility */}
            <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-3">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {ghostMode ? (
                    <EyeSlashIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                    ) : (
                    <EyeIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                    )}
                    <div>
                    <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
                        Visibility
                    </div>
                    <div className="text-xs text-slate-600 dark:text-green-300/70">
                        Default: Ghost Mode ON
                    </div>
                    </div>
                </div>

                <button
                    onClick={() => setGhostMode((v) => !v)}
                    className={`rounded-xl px-3 py-2 font-mono text-sm border
                    ${
                        ghostMode
                        ? "border-emerald-600/30 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                        : "border-slate-300 dark:border-green-500/15 bg-white/60 dark:bg-black/25 text-slate-700 dark:text-green-300/80 hover:bg-slate-100 dark:hover:bg-green-500/10"
                    }
                    ${focusRing}`}
                >
                    {ghostMode ? "Ghost" : "Reveal"}
                </button>
                </div>

                <div className="mt-2 text-xs text-slate-600 dark:text-green-300/70">
                Reveal is coarse + temporary (later). No user pins.
                </div>
            </div>

            {/* Activity */}
            <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-3">
                <div className="flex items-center gap-2 mb-2">
                <SignalIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
                    Activity
                </div>
                </div>

                <div className="text-sm text-slate-900 dark:text-green-200">
                Active ghosts: <span className="font-mono">{activity.active}</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-green-300/70">
                pulses: <span className="font-mono">{activity.pulses}</span> • updated{" "}
                <span className="font-mono">{activity.updated}</span>
                </div>
            </div>
            </div>

            {/* Bottom-right legend */}
            <div className="absolute bottom-4 right-4 rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur px-3 py-2">
            <div className="font-mono text-xs text-slate-700 dark:text-green-300/70">
                Legend: density only • no pins • no identity
            </div>
            </div>
        </div>
        </div>
    );
}
