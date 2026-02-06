    import { useMemo } from "react";
    import { useNavigate } from "react-router-dom";
    import { useTrust } from "../contexts/TrustContext";

    const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

    function prettyUserLabel(threadId: string) {
    // user_483921 -> User #483921
    const num = threadId.replace("user_", "");
    return `User #${num}`;
    }

    function timeAgo(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.max(1, Math.floor(ms / 60000));
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
    }

    export default function Messages() {
    const navigate = useNavigate();
    const { requests } = useTrust();

    // Only show accepted (trusted) threads
    const threads = useMemo(() => {
        const accepted = requests
        .filter((r) => r.status === "accepted")
        // de-dupe by fromUserKey (keep newest)
        .sort((a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime());

        const seen = new Set<string>();
        const deduped = [];
        for (const r of accepted) {
        if (seen.has(r.fromUserKey)) continue;
        seen.add(r.fromUserKey);
        deduped.push(r);
        }
        return deduped;
    }, [requests]);

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-0">
        {/* Header */}
        <div className={`${card} p-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Messages
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                Trusted channels only
                </p>
            </div>

            <div className="w-fit rounded-full border border-emerald-600/30 dark:border-green-500/30 bg-white/60 dark:bg-black/20 px-3 py-1 text-sm font-mono text-emerald-800 dark:text-green-300">
                threads: {threads.length}
            </div>
            </div>
        </div>

        {/* Threads */}
        <div className="space-y-3">
            {threads.length === 0 ? (
            <div className={`${card} p-4`}>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                No trusted threads yet. Accept a trust request to unlock messaging.
                </p>

                <button
                type="button"
                onClick={() => navigate("/app/trust")}
                className="mt-3 rounded-xl px-3 py-2 text-xs font-mono border border-emerald-500/25 dark:border-green-500/25
                    bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200
                    hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                >
                Go to Trust
                </button>
            </div>
            ) : (
            threads.map((t) => (
                <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/app/messages/${t.fromUserKey}`)}
                className={`${card} w-full text-left p-4 transition hover:bg-emerald-500/5 dark:hover:bg-green-500/5`}
                >
                <div className="flex items-center justify-between gap-3">
                    <div>
                    <div className="font-mono text-sm text-emerald-700 dark:text-green-300">
                        {t.fromLabel || prettyUserLabel(t.fromUserKey)}
                    </div>
                    <div className="mt-1 text-xs font-mono text-slate-500 dark:text-green-300/60">
                        {timeAgo(t.createdAtISO)} • trusted
                        {typeof t.postId === "number" ? ` • post ${t.postId}` : ""}
                    </div>
                    </div>

                    <div className="rounded-full px-3 py-1 text-xs font-mono border border-emerald-500/25 dark:border-green-500/25
                    bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-200">
                    Open
                    </div>
                </div>

                {t.note ? (
                    <div className="mt-3 text-sm text-slate-700 dark:text-green-100/80 line-clamp-2">
                    {t.note}
                    </div>
                ) : (
                    <div className="mt-3 text-sm text-slate-600 dark:text-green-300/60">
                    No preview available.
                    </div>
                )}
                </button>
            ))
            )}
        </div>
        </div>
    );
    }
