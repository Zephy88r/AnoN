import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TrustRequestModal from "../components/TrustRequestModal";
import { useTrust } from "../contexts/TrustContext";
import { ensureThreadForPeer } from "../services/thread";
import { createPost, fetchFeed } from "../services/postsApi";
import type { ApiPost } from "../services/postsApi";

export default function HomeFeed() {
    const navigate = useNavigate();

    const [hoveredReplyId, setHoveredReplyId] = useState<number | null>(null);
    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [postText, setPostText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [postsLeftToday, setPostsLeftToday] = useState(3);

    // TrustContext is the single source of truth (persists via localStorage)
    const { getStatusForUser } = useTrust();

    // Step B modal state
    const [trustOpen, setTrustOpen] = useState(false);
    const [pendingPostId, setPendingPostId] = useState<string | null>(null);

    // Load posts on mount
    useEffect(() => {
        const loadPosts = async () => {
            try {
                const result = await fetchFeed();
                setPosts(result.posts);
            } catch (err) {
                console.error("Failed to load feed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadPosts();
    }, []);

    const handlePostSubmit = async () => {
        const trimmedText = postText.trim();
        
        if (!trimmedText) {
            alert("Post cannot be empty");
            return;
        }

        if (trimmedText.length > 280) {
            alert("Post exceeds 280 characters");
            return;
        }

        if (postsLeftToday <= 0) {
            alert("Daily post limit reached");
            return;
        }

        setIsSubmitting(true);
        try {
            const newPost = await createPost(trimmedText);
            // Add new post to the top of the feed
            setPosts([newPost, ...posts]);
            setPostText("");
            setPostsLeftToday(postsLeftToday - 1);
        } catch (err) {
            console.error("Post creation failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Error creating post";
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openTrustModal = (postId: string) => {
        setPendingPostId(postId);
        setTrustOpen(true);
        setHoveredReplyId(null);
    };

    const closeTrustModal = () => {
        setTrustOpen(false);
        setPendingPostId(null);
        setHoveredReplyId(null);
    };

    const confirmTrustRequest = (_postId: string, _message?: string) => {
        // Trust request would be implemented here
        console.log("Trust request for post:", _postId);
        closeTrustModal();
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
                {postsLeftToday} posts left
            </div>
            </div>
        </div>

        {/* Post Composer */}
        <div className="rounded-2xl border border-emerald-500/20 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4 space-y-3">
            <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full resize-none rounded-xl bg-transparent p-3 text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-300/50 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-green-500/30"
            rows={3}
            maxLength={280}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs font-mono text-slate-600 dark:text-green-300/70">
                {postText.length}/280 • {postsLeftToday} posts left today
            </span>

            <button
                disabled={isSubmitting || postsLeftToday <= 0 || !postText.trim()}
                type="button"
                onClick={handlePostSubmit}
                className="w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 dark:border-green-500/30
                bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-300 hover:bg-emerald-500/20 dark:hover:bg-green-500/20
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isSubmitting ? "Posting..." : "Post"}
            </button>
            </div>
        </div>

        {/* Posts */}
        {isLoading ? (
            <div className="text-center py-8 text-slate-600 dark:text-green-300/70">Loading feed...</div>
        ) : posts.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-green-300/70">No posts yet. Be the first to post!</div>
        ) : (
        <div className="space-y-4">
            {posts.map((post) => {
            const userKey = `user_${post.anon_id.substring(0, 8)}`; // threadId & trust key
            const status = getStatusForUser(userKey); // "none" | "pending" | "accepted" | "declined"
            const trusted = status === "accepted";

            const isPendingHere = trustOpen && pendingPostId === post.id;

            const timeAgo = (isoDate: string) => {
                const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
                if (minutes < 1) return "just now";
                if (minutes < 60) return `${minutes}m ago`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours}h ago`;
                return `${Math.floor(hours / 24)}d ago`;
            };

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
                key={post.id}
                className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4"
                >
                <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                    User #{post.anon_id.substring(0, 8)}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                    {timeAgo(post.created_at)}
                    </span>
                </div>

                <p className="text-slate-800 dark:text-green-100 leading-relaxed">
                    {post.text}
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
                        const thread = ensureThreadForPeer(userKey);
                        navigate(`/app/messages/${thread.id}`);
                        }}
                        onMouseEnter={() => !trusted && setHoveredReplyId(parseInt(post.id.substring(0, 8), 16))}
                        onMouseLeave={() => setHoveredReplyId(null)}
                        onFocus={() => !trusted && setHoveredReplyId(parseInt(post.id.substring(0, 8), 16))}
                        onBlur={() => setHoveredReplyId(null)}
                        className={`font-mono transition ${
                        trusted
                            ? "text-slate-600 dark:text-green-300/70 hover:text-emerald-700 dark:hover:text-green-200"
                            : "text-slate-400 dark:text-green-300/40 cursor-not-allowed"
                        }`}
                    >
                        reply
                    </button>

                    {!trusted && hoveredReplyId === parseInt(post.id.substring(0, 8), 16) && (
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
                        onClick={() => openTrustModal(post.id)}
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

                    {/* ✅ Start Chat button (only when trusted) */}
                    {trusted && (
                        <button
                        type="button"
                        onClick={() => {
                            const thread = ensureThreadForPeer(userKey);
                            navigate(`/app/messages/${thread.id}`);
                        }}
                        className="rounded-lg px-3 py-1 border border-emerald-500/30 dark:border-green-500/30
                            bg-emerald-500/10 dark:bg-green-500/10 text-slate-800 dark:text-green-200
                            hover:bg-emerald-500/15 dark:hover:bg-green-500/15 transition"
                        >
                        Start chat
                        </button>
                    )}
                </div>
                </div>
            );
            })}
        </div>        )}
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
