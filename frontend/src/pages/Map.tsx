import { useMemo, useState } from "react";
import {
    MapPinIcon,
    EyeSlashIcon,
    EyeIcon,
    GlobeAltIcon,
    SignalIcon,
    ShieldCheckIcon,
    ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

import TrustRequestModal from "../components/TrustRequestModal";
import { useTrust } from "../contexts/TrustContext";
import { useNavigate } from "react-router-dom";
import { useGeoPings } from "../hooks/useGeoPings";
import type { GeoPing } from "../services/geo";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function timeAgo(iso: string) {
    const ms = Date.now() - Date.parse(iso);
    const m = Math.max(1, Math.round(ms / 60000));
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
}

export default function Map() {
    const navigate = useNavigate();

  // UI state
    const [ghostMode, setGhostMode] = useState(true);
    const [region, setRegion] = useState("NEPAL • BAGMATI");
    const mode = ghostMode ? "ghost" : "reveal";

  // GEO pings
    const { geoState, pings } = useGeoPings({ region, mode, enabled: true });

  // Trust
    const { submitTrustRequest, getStatusForUser } = useTrust();

  // Modal state
    const [trustOpen, setTrustOpen] = useState(false);
    const [selected, setSelected] = useState<GeoPing | null>(null);

  // Hover state (right-side HUD in map)
    const [hovered, setHovered] = useState<GeoPing | null>(null);

  // Stats (UI-only)
    const activity = useMemo(() => {
    const base = ghostMode ? 14 : 22;
    return {
        active: base,
        pulses: ghostMode ? "low" : "medium",
        updated: "just now",
    };
    }, [ghostMode, region]);

    const safePings = useMemo(() => {
        return pings.map((p) => ({
        ...p,
        x: clamp(p.x, 10, 90),
        y: clamp(p.y, 12, 88),
        }));
    }, [pings]);

    const openTrust = (g: GeoPing) => {
    setSelected(g);
    setTrustOpen(true);
    };

    const closeTrust = () => {
        setTrustOpen(false);
        setSelected(null);
    };

    const confirmTrust = (message?: string) => {
        if (!selected) return;
        submitTrustRequest({
        fromLabel: selected.label,
        fromUserKey: selected.userKey,
        note: message,
        });
    };

    const tooltipText = (g: GeoPing) => {
        const status = getStatusForUser(g.userKey);
        if (status === "accepted") return "Trusted • channel unlocked";
        if (status === "pending") return "Requested • awaiting response";
        if (status === "declined") return "Declined • no retry";
        return "Request trust";
    };

    const geoLabel =
        geoState.status === "watching"
        ? "active"
        : geoState.status === "denied"
        ? "denied"
        : geoState.status === "unsupported"
        ? "unsupported"
        : geoState.status === "error"
        ? "error"
        : "idle";

    return (
        <div className="mx-auto w-full max-w-6xl space-y-4 px-3 sm:px-0">
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

            <div
            className={`rounded-full px-3 py-1 font-mono text-sm border transition
                ${
                ghostMode
                    ? "border-emerald-600/30 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200"
                    : "border-slate-300 dark:border-green-500/15 bg-white/60 dark:bg-black/25 text-slate-700 dark:text-green-300/70"
                }`}
            >
            {ghostMode ? "Ghost Mode: ON" : "Ghost Mode: OFF"}
            </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
            {/* MAP */}
            <div className={`${card} relative overflow-hidden`} style={{ height: "72vh" }}>
            {/* Background */}
            <div className="absolute inset-0">
                <div className="h-full w-full bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 dark:from-green-500/10 dark:to-green-500/5" />
                <div className="absolute inset-0 opacity-60 dark:opacity-70 mix-blend-multiply dark:mix-blend-screen">
                <div
                    className="h-full w-full"
                    style={{
                    backgroundImage:
                        "linear-gradient(to right, rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.12) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                    }}
                />
                </div>

                <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/15 dark:bg-green-500/12 blur-3xl" />
                <div className="absolute top-1/3 left-1/2 h-96 w-96 rounded-full bg-emerald-500/12 dark:bg-green-500/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/10 dark:bg-green-500/10 blur-3xl" />
            </div>

            {/* Clickable pings */}
            <div className="absolute inset-0">
                {safePings.map((g) => {
                const status = getStatusForUser(g.userKey);
                const isHover = hovered?.userKey === g.userKey;

                const ringClass =
                    status === "accepted"
                    ? "ring-emerald-500/55 dark:ring-green-400/55"
                    : status === "pending"
                    ? "ring-slate-400/45 dark:ring-green-300/30"
                    : status === "declined"
                    ? "ring-slate-400/30 dark:ring-green-300/20"
                    : "ring-emerald-500/25 dark:ring-green-500/25";

                const coreDot =
                    g.signal === "high"
                    ? "bg-emerald-600/85 dark:bg-green-400/85"
                    : g.signal === "med"
                    ? "bg-emerald-600/60 dark:bg-green-400/60"
                    : "bg-emerald-600/35 dark:bg-green-400/35";

                // signal-based speeds
                const dur = g.signal === "high" ? 1.4 : g.signal === "med" ? 2.1 : 2.9;
                const softDur = g.signal === "high" ? 2.2 : g.signal === "med" ? 3.2 : 4.4;
                const echoDur = g.signal === "high" ? 1.9 : g.signal === "med" ? 2.9 : 3.9;

                // status intensity: still animate even if declined/accepted, just calmer
                const intensity =
                    status === "pending" ? 1 :
                    status === "none" ? 0.85 :
                    status === "accepted" ? 0.35 :
                    0.25; // declined

                const glow =
                    status === "pending"
                    ? "shadow-[0_0_28px_rgba(16,185,129,0.25)] dark:shadow-[0_0_28px_rgba(34,197,94,0.18)]"
                    : "shadow-[0_0_18px_rgba(16,185,129,0.16)] dark:shadow-[0_0_18px_rgba(34,197,94,0.12)]";

                return (
                    <button
                    key={g.userKey}
                    type="button"
                    onClick={() => openTrust(g)}
                    onMouseEnter={() => setHovered(g)}
                    onMouseLeave={() => setHovered(null)}
                    aria-label={`${g.label} ping`}
                    className={`
                        absolute -translate-x-1/2 -translate-y-1/2 rounded-full
                        transition-transform duration-200
                        hover:scale-110 active:scale-95
                        ${focusRing}
                    `}
                    style={{ left: `${g.x}%`, top: `${g.y}%` }}
                    >
                    <span className="relative block h-10 w-10">
                        {/* Glow halo */}
                        <span
                        className={`
                            absolute inset-0 rounded-full blur-md
                            bg-emerald-500/12 dark:bg-green-500/12
                            ${glow}
                            ${isHover ? "opacity-100" : "opacity-70"}
                        `}
                        />

                        {/* Static base ring */}
                        <span
                        className={`
                            absolute inset-0 rounded-full ring-2 ${ringClass}
                            bg-white/5 dark:bg-black/10
                            opacity-70
                        `}
                        />

                        {/* TRUE RADAR: expanding rings */}
                        <span
                        className={`
                            absolute inset-0 rounded-full ring-2 ${ringClass}
                            pointer-events-none
                            [animation-name:radar-expand]
                            [animation-timing-function:linear]
                            [animation-iteration-count:infinite]
                            [will-change:transform,opacity]
                        `}
                        style={{
                            animationDuration: `${dur}s`,
                            opacity: intensity,
                        }}
                        />
                        <span
                        className={`
                            absolute inset-0 rounded-full ring-2 ${ringClass}
                            pointer-events-none
                            [animation-name:radar-expand]
                            [animation-timing-function:linear]
                            [animation-iteration-count:infinite]
                            [will-change:transform,opacity]
                        `}
                        style={{
                            animationDuration: `${dur}s`,
                            animationDelay: `${dur * 0.45}s`,
                            opacity: intensity * 0.75,
                        }}
                        />
                        <span
                        className={`
                            absolute inset-0 rounded-full ring-2 ${ringClass}
                            pointer-events-none
                            [animation-name:radar-expand-soft]
                            [animation-timing-function:linear]
                            [animation-iteration-count:infinite]
                            [will-change:transform,opacity]
                        `}
                        style={{
                            animationDuration: `${softDur}s`,
                            animationDelay: `${softDur * 0.35}s`,
                            opacity: intensity * 0.55,
                        }}
                        />

                        {/* Silent echo sweep arc */}
                        <span
                        className={`
                            absolute inset-0 rounded-full pointer-events-none
                            [animation-name:radar-echo]
                            [animation-timing-function:linear]
                            [animation-iteration-count:infinite]
                            [will-change:transform,opacity]
                        `}
                        style={{
                            animationDuration: `${echoDur}s`,
                            opacity: intensity * 0.9,
                        }}
                        >
                        <span
                            className={`
                            absolute inset-0 rounded-full
                            bg-[conic-gradient(from_180deg,rgba(16,185,129,0)_0deg,rgba(16,185,129,0.18)_40deg,rgba(16,185,129,0)_90deg)]
                            dark:bg-[conic-gradient(from_180deg,rgba(34,197,94,0)_0deg,rgba(34,197,94,0.16)_40deg,rgba(34,197,94,0)_90deg)]
                            blur-[0.4px]
                            `}
                        />
                        </span>

                        {/* Core dot */}
                        <span
                        className={`
                            absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                            h-3.5 w-3.5 rounded-full
                            ${coreDot}
                            ${isHover ? "shadow-[0_0_18px_rgba(16,185,129,0.55)] dark:shadow-[0_0_18px_rgba(34,197,94,0.45)]" : ""}
                        `}
                        />

                        {/* Hover outline */}
                        <span
                        className={`
                            absolute inset-0 rounded-full
                            ${isHover ? "ring-4 ring-emerald-500/20 dark:ring-green-500/20" : ""}
                        `}
                        />
                    </span>
                    </button>
                );
                })}
            </div>

            {/* Right-side hover HUD (inside map) */}
            <div className="absolute top-4 right-4 w-[260px] sm:w-[300px]">
                <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/75 dark:bg-black/55 backdrop-blur p-3">
                <div className="text-xs font-mono text-slate-500 dark:text-green-300/60">
                    hover intel
                </div>

                {!hovered ? (
                    <div className="mt-2 text-sm text-slate-800 dark:text-green-200">
                    Hover a ping to inspect.
                    </div>
                ) : (
                    <>
                    <div className="mt-2 font-mono text-sm text-emerald-700 dark:text-green-300">
                        {hovered.label}
                    </div>

                    <div className="mt-1 text-xs font-mono text-slate-600 dark:text-green-300/70">
                        {Math.round(hovered.distanceM)}m • {timeAgo(hovered.lastSeenISO)} • {hovered.hint}
                    </div>

                    <div className="mt-2 text-xs text-slate-700 dark:text-green-200">
                        {tooltipText(hovered)}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {(() => {
                        const status = getStatusForUser(hovered.userKey);
                        const canRequest = status === "none";
                        const canOpenChat = status === "accepted";

                        return (
                            <>
                            <button
                                type="button"
                                disabled={!canRequest}
                                onClick={() => openTrust(hovered)}
                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono border transition
                                ${
                                    canRequest
                                    ? "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                                    : "border-slate-300 dark:border-green-500/15 text-slate-400 dark:text-green-400/40 cursor-not-allowed"
                                }`}
                            >
                                <ShieldCheckIcon className="h-4 w-4" />
                                Trust
                            </button>

                            <button
                                type="button"
                                disabled={!canOpenChat}
                                onClick={() => navigate(`/app/messages/${hovered.userKey}`)}
                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono border transition
                                ${
                                    canOpenChat
                                    ? "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                                    : "border-slate-300 dark:border-green-500/15 text-slate-400 dark:text-green-400/40 cursor-not-allowed"
                                }`}
                            >
                                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                Chat
                            </button>
                            </>
                        );
                        })()}
                    </div>
                    </>
                )}
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur px-3 py-2">
                <div className="font-mono text-xs text-slate-700 dark:text-green-300/70">
                Legend: density only • no pins • no identity
                </div>
            </div>
            </div>

            {/* RIGHT SIDE PANEL */}
            <div className="space-y-4">
            {/* Controls */}
            <div className={`${card} p-4`}>
                <div className="text-sm font-semibold text-slate-900 dark:text-green-100">
                Controls
                </div>

                {/* Region */}
                <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                    <MapPinIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                    <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
                    Region
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
                <div className="mt-4 flex items-center justify-between">
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
                    className={`rounded-xl px-3 py-2 font-mono text-sm border transition
                    hover:-translate-y-[1px] active:translate-y-0
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

                {/* Activity */}
                <div className="mt-4 rounded-xl border border-emerald-500/10 dark:border-green-500/15 bg-white/45 dark:bg-black/30 p-3">
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
                <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
                    geo: <span className="font-mono">{geoLabel}</span>
                </div>
                </div>
            </div>

            {/* (keeping your Ghost pings list section as-is; it’s fine) */}
            </div>
        </div>

        {/* Trust modal */}
        <TrustRequestModal
            open={trustOpen}
            onClose={closeTrust}
            onSubmit={(message?: string) => confirmTrust(message)}
            targetLabel={
            selected
                ? `${selected.label} • ${Math.round(selected.distanceM)}m • ${timeAgo(selected.lastSeenISO)}`
                : undefined
            }
            maxChars={200}
        />
        </div>
    );
}
