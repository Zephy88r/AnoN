    import { useMemo } from "react";
    import { useTrust } from "../contexts/TrustContext";

    function timeAgo(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.max(1, Math.floor(ms / 60000));
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
    }

    export default function Trust() {
    const { requests, acceptRequest, declineRequest } = useTrust();

    const pending = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
    const history = useMemo(() => requests.filter((r) => r.status !== "pending"), [requests]);

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
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                    <div className="font-mono text-sm text-emerald-700 dark:text-green-300">
                        {r.fromLabel}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                        {timeAgo(r.createdAtISO)}
                        {typeof r.postId === "number" ? ` • post ${r.postId}` : ""}
                    </div>
                    </div>

                    <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => declineRequest(r.id)}
                        className="rounded-xl px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-green-500/15
                        text-slate-700 dark:text-green-200/70 hover:bg-slate-100 dark:hover:bg-green-500/10"
                    >
                        Decline
                    </button>
                    <button
                        type="button"
                        onClick={() => acceptRequest(r.id)}
                        className="rounded-xl px-3 py-1.5 text-xs font-mono border border-emerald-500/25 dark:border-green-500/25
                        bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                    >
                        Accept
                    </button>
                    </div>
                </div>

                {r.note ? (
                    <div className="mt-3 rounded-xl border border-emerald-500/10 dark:border-green-500/15 bg-white/50 dark:bg-black/30 p-3">
                    <div className="text-[11px] font-mono text-slate-500 dark:text-green-300/60">
                        note
                    </div>
                    <div className="mt-1 text-sm text-slate-800 dark:text-green-100">
                        {r.note}
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
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                    <div className="font-mono text-sm text-emerald-700 dark:text-green-300">
                        {r.fromLabel}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                        {timeAgo(r.createdAtISO)}
                        {typeof r.postId === "number" ? ` • post ${r.postId}` : ""}
                    </div>
                    </div>

                    <div
                    className={`rounded-full px-3 py-1 text-xs font-mono border
                        ${
                        r.status === "accepted"
                            ? "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-200"
                            : "border-slate-300 dark:border-green-500/15 bg-white/50 dark:bg-black/20 text-slate-600 dark:text-green-200/60"
                        }`}
                    >
                    {r.status === "accepted" ? "Accepted" : "Declined"}
                    </div>
                </div>

                {r.note ? (
                    <div className="mt-3 text-sm text-slate-700 dark:text-green-100/80">
                    {r.note}
                    </div>
                ) : null}
                </div>
            ))
            )}
        </div>
        </div>
    );
    }
