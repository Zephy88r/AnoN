import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TrustRequestModal from "../components/TrustRequestModal";
import { useTrust } from "../contexts/TrustContext";

export default function HomeFeed() {
    const navigate = useNavigate();

    const [hoveredReplyId, setHoveredReplyId] = useState<number | null>(null);

    // TrustContext is the single source of truth (persists via localStorage)
    const { submitTrustRequest, getStatusForUser } = useTrust();

    // Step B modal state
    const [trustOpen, setTrustOpen] = useState(false);
    const [pendingPostId, setPendingPostId] = useState<number | null>(null);

    const openTrustModal = (postId: number) => {
        setPendingPostId(postId);
        setTrustOpen(true);
        setHoveredReplyId(null);
    };

    const closeTrustModal = () => {
        setTrustOpen(false);
        setPendingPostId(null);
        setHoveredReplyId(null);
    };

    const confirmTrustRequest = (postId: number, message?: string) => {
        submitTrustRequest({
        fromLabel: `User #${483920 + postId}`,
        fromUserKey: `user_${483920 + postId}`, // threadId
        postId,
        note: message,
        });
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-0">
            
        {/* Header */}
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Feed
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                Anonymous network feed
                </p>
            </div>

            <div className="w-fit rounded-full border border-emerald-600/30 dark:border-green-500/30 bg-white/60 dark:bg-black/20 px-3 py-1 text-sm font-mono text-emerald-800 dark:text-green-300">
                3 posts left
            </div>
            </div>
        </div>

        {/* Post Composer (disabled for now) */}
        <div className="rounded-2xl border border-emerald-500/20 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4 space-y-3">
            <textarea
            disabled
            placeholder="What’s on your mind?"
            className="w-full resize-none rounded-xl bg-transparent p-3 text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-300/50 outline-none"
            rows={3}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs font-mono text-slate-600 dark:text-green-300/70">
                posts left today: 3
            </span>

            <button
                disabled
                type="button"
                className="w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 dark:border-green-500/30
                text-slate-500 dark:text-green-400/50 cursor-not-allowed"
            >
                Post
            </button>
            </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
            {[1, 2, 3].map((id) => {
            const userKey = `user_${483920 + id}`; // threadId & trust key
            const status = getStatusForUser(userKey); // "none" | "pending" | "accepted" | "declined"
            const trusted = status === "accepted";

            const isPendingHere = trustOpen && pendingPostId === id;

            const trustButtonLabel =
                status === "none" ? (
                isPendingHere ? (
                    <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600/70 dark:bg-green-400/70 animate-pulse" />
                    Pending…
                    </span>
                ) : (
                    "Request Trust"
                )
                ) : status === "pending" ? (
                "Requested"
                ) : status === "accepted" ? (
                "Trusted"
                ) : (
                "Declined"
                );

            const trustButtonDisabled = status !== "none" || isPendingHere;

            const trustButtonClass =
                status === "none"
                ? isPendingHere
                    ? "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/5 dark:bg-green-500/5 text-slate-500 dark:text-green-200/70 cursor-not-allowed select-none"
                    : "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-slate-800 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                : status === "accepted"
                    ? "border-emerald-500/35 dark:border-green-500/35 bg-emerald-500/15 dark:bg-green-500/15 text-emerald-900 dark:text-green-200 cursor-not-allowed select-none shadow-[0_0_18px_rgba(34,197,94,0.10)]"
                    : "border-slate-300 dark:border-green-500/15 text-slate-400 dark:text-green-400/40 cursor-not-allowed select-none";

            return (
                <div
                key={id}
                className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4"
                >
                <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                    User #{483920 + id}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                    {id * 2}m ago
                    </span>
                </div>

                <p className="text-slate-800 dark:text-green-100 leading-relaxed">
                    This is a sample anonymous post. No identity, no profile, just
                    thoughts shared freely on the network.
                </p>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono">
                    {/* Reply with trust gate + tooltip */}
                    <div className="relative">
                    <button
                        type="button"
                        disabled={!trusted}
                        onClick={() => {
                        if (!trusted) return;
                        navigate(`/app/messages/${userKey}`);
                        }}
                        onMouseEnter={() => !trusted && setHoveredReplyId(id)}
                        onMouseLeave={() => setHoveredReplyId(null)}
                        onFocus={() => !trusted && setHoveredReplyId(id)}
                        onBlur={() => setHoveredReplyId(null)}
                        className={`font-mono transition ${
                        trusted
                            ? "text-slate-600 dark:text-green-300/70 hover:text-emerald-700 dark:hover:text-green-200"
                            : "text-slate-400 dark:text-green-300/40 cursor-not-allowed"
                        }`}
                    >
                        reply
                    </button>

                    {!trusted && hoveredReplyId === id && (
                        <div
                        className="
                            absolute left-1/2 -translate-x-1/2 mt-2
                            whitespace-nowrap rounded-md px-2 py-1
                            text-[11px] font-mono
                            bg-slate-900 text-slate-100
                            dark:bg-black dark:text-green-200
                            border border-slate-700 dark:border-green-500/20
                            shadow-lg z-20
                        "
                        >
                        Trust required to reply
                        </div>
                    )}
                    </div>

                    {/* Trust button + microcopy */}
                    <div className="flex flex-col items-start gap-1">
                    <button
                        type="button"
                        disabled={trustButtonDisabled}
                        onClick={() => openTrustModal(id)}
                        className={`rounded-lg px-3 py-1 border transition ${trustButtonClass}`}
                    >
                        {trustButtonLabel}
                    </button>

                    {status === "pending" && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-green-300/50">
                        One-time request sent
                        </span>
                    )}

                    {status === "accepted" && (
                        <span className="text-[11px] font-mono text-emerald-700/80 dark:text-green-300/70">
                        Trust established
                        </span>
                    )}

                    {status === "declined" && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-green-300/40">
                        Request declined
                        </span>
                    )}
                    </div>
                </div>
                </div>
            );
            })}
        </div>

        {/* Step B: Trust Request Modal */}
        <TrustRequestModal
            open={trustOpen}
            onClose={closeTrustModal}
            onSubmit={(message?: string) => {
            if (pendingPostId == null) return;
            confirmTrustRequest(pendingPostId, message);
            }}
            targetLabel={
            pendingPostId != null
                ? `User #${483920 + pendingPostId} • Post ${pendingPostId}`
                : undefined
            }
            maxChars={200}
        />
        </div>
    );
}
