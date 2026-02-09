import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrust } from "../contexts/TrustContext";
import { threadIdFromCode } from "../services/thread";

function timeAgo(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.max(1, Math.floor(ms / 60000));
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

// Short safe label (no identity, just an opaque hint)
function shortKey(k: string) {
    if (!k) return "unknown";
    return `${k.slice(0, 8)}…${k.slice(-4)}`;
}

export default function Trust() {
    const navigate = useNavigate();
    const { requests, acceptRequest, declineRequest, refresh } = useTrust();

    const [busyId, setBusyId] = useState<string | null>(null);

    // Prevent repeated redirects
    const redirected = useRef(false);

    // ✅ Auto-enter chat when any request becomes accepted (and has a code)
    useEffect(() => {
        if (redirected.current) return;

        const accepted = requests.find((r) => r.status === "accepted" && r.code);
        if (!accepted?.code) return;

        redirected.current = true;
        navigate(`/app/messages/${threadIdFromCode(accepted.code)}`, { replace: true });
    }, [requests, navigate]);

    const pending = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
    const history = useMemo(() => requests.filter((r) => r.status !== "pending"), [requests]);

    const onAccept = async (id: string) => {
        try {
        setBusyId(id);
        await acceptRequest(id);
        await refresh(); // make sure latest comes in quickly
        // redirect will happen via useEffect
        } finally {
        setBusyId(null);
        }
    };

    const onDecline = async (id: string) => {
        try {
        setBusyId(id);
        await declineRequest(id);
        await refresh();
        } finally {
        setBusyId(null);
        }
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-0">
        {/* Header */}
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Trust
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                Requests you can accept or decline
                </p>
            </div>

            <div className="w-fit rounded-full border border-emerald-600/30 dark:border-green-500/30 bg-white/60 dark:bg-black/20 px-3 py-1 text-sm font-mono text-emerald-800 dark:text-green-300">
                pending: {pending.length}
            </div>
            </div>
        </div>

        {/* Pending requests */}
        <div className="space-y-3">
            <div className="text-xs font-mono text-slate-600 dark:text-green-300/70">
            Incoming requests
            </div>

            {pending.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4">
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                No pending trust requests.
                </p>
            </div>
            ) : (
            pending.map((r) => (
                <div
                key={r.id}
                className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4"
                >
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                    <div className="font-mono text-sm text-emerald-700 dark:text-green-300 truncate">
                        incoming: {shortKey(r.peerKey)}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                        {timeAgo(r.createdAtISO)}
                        {r.code ? ` • code ${r.code}` : ""}
                    </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => onDecline(r.id)}
                        disabled={busyId === r.id}
                        className="rounded-xl px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-green-500/15
                        text-slate-700 dark:text-green-200/70 hover:bg-slate-100 dark:hover:bg-green-500/10 disabled:opacity-50"
                    >
                        Decline
                    </button>
                    <button
                        type="button"
                        onClick={() => onAccept(r.id)}
                        disabled={busyId === r.id}
                        className="rounded-xl px-3 py-1.5 text-xs font-mono border border-emerald-500/25 dark:border-green-500/25
                        bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15 disabled:opacity-50"
                    >
                        Accept
                    </button>
                    </div>
                </div>

                {/* Optional extra UI for code */}
                {r.code ? (
                    <div className="mt-3 rounded-xl border border-emerald-500/10 dark:border-green-500/15 bg-white/50 dark:bg-black/30 p-3">
                    <div className="text-[11px] font-mono text-slate-500 dark:text-green-300/60">
                        link code
                    </div>
                    <div className="mt-1 text-sm font-mono text-slate-800 dark:text-green-100">
                        {r.code}
                    </div>
                    </div>
                ) : null}
                </div>
            ))
            )}
        </div>

        {/* History */}
        <div className="space-y-3">
            <div className="text-xs font-mono text-slate-600 dark:text-green-300/70">
            History
            </div>

            {history.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4">
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                No history yet.
                </p>
            </div>
            ) : (
            history.map((r) => (
                <div
                key={r.id}
                className="rounded-2xl border border-emerald-500/10 dark:border-green-500/15 bg-white/50 dark:bg-black/40 backdrop-blur p-4"
                >
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                    <div className="font-mono text-sm text-emerald-700 dark:text-green-300 truncate">
                        peer: {shortKey(r.peerKey)}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                        {timeAgo(r.createdAtISO)}
                        {r.code ? ` • code ${r.code}` : ""}
                    </div>
                    </div>

                    <div
                    className={`rounded-full px-3 py-1 text-xs font-mono border shrink-0
                        ${
                        r.status === "accepted"
                            ? "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-200"
                            : "border-slate-300 dark:border-green-500/15 bg-white/50 dark:bg-black/20 text-slate-600 dark:text-green-200/60"
                        }`}
                    >
                    {r.status === "accepted" ? "Accepted" : "Declined"}
                    </div>
                </div>
                </div>
            ))
            )}
        </div>
        </div>
    );
}
