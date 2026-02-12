import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TrustRequestModal from "../components/TrustRequestModal";
import { useTrust } from "../contexts/TrustContext";
import { ensureThreadForPeer } from "../services/thread";
import { createPost, fetchFeed, deletePost, likePost, dislikePost, getRemainingPosts, createComment, getComments, deleteComment, likeComment, dislikeComment, createCommentReply, getCommentReplies, deleteCommentReply } from "../services/postsApi";
import type { ApiPost, ApiComment, ApiCommentReply } from "../services/postsApi";
import { getMyAnonId } from "../services/session";

export default function HomeFeed() {
    const navigate = useNavigate();

    const [hoveredReplyId, setHoveredReplyId] = useState<number | null>(null);
    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [postText, setPostText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [postsLeftToday, setPostsLeftToday] = useState(3);
    const [myAnonId, setMyAnonId] = useState<string | null>(null);

    // Comment state
    const [commentText, setCommentText] = useState<Record<string, string>>({});
    const [showComments, setShowComments] = useState<Record<string, boolean>>({});
    const [comments, setComments] = useState<Record<string, ApiComment[]>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
    const [commentSort, setCommentSort] = useState<Record<string, 'newest' | 'oldest'>>({});
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
    const [replies, setReplies] = useState<Record<string, ApiCommentReply[]>>({});
    const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});

    // TrustContext is the single source of truth (persists via localStorage)
    const { getStatusForUser } = useTrust();

    // Step B modal state
    const [trustOpen, setTrustOpen] = useState(false);
    const [pendingPostId, setPendingPostId] = useState<string | null>(null);

    // Load my anon ID on mount
    useEffect(() => {
        const id = getMyAnonId();
        setMyAnonId(id);
    }, []);

    // Load posts and remaining count on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const [feedResult, remainingResult] = await Promise.all([
                    fetchFeed(),
                    getRemainingPosts()
                ]);
                setPosts(feedResult.posts);
                setPostsLeftToday(remainingResult.remaining);
            } catch (err) {
                console.error("Failed to load feed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
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
            const response = await createPost(trimmedText);
            // Add new post to the top of the feed
            setPosts([response.post, ...posts]);
            setPostText("");
            setPostsLeftToday(response.posts_remaining);
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

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to delete this post?")) {
            return;
        }

        try {
            await deletePost(postId);
            // Remove post from UI
            setPosts(posts.filter(p => p.id !== postId));
        } catch (err) {
            console.error("Failed to delete post:", err);
            alert("Failed to delete post. You can only delete your own posts.");
        }
    };

    const handleLikePost = async (postId: string) => {
        try {
            const updatedPost = await likePost(postId);
            // Update post in UI
            setPosts(posts.map(p => p.id === postId ? updatedPost : p));
        } catch (err) {
            console.error("Failed to like post:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to like post";
            alert(errorMessage);
        }
    };

    const handleDislikePost = async (postId: string) => {
        try {
            const updatedPost = await dislikePost(postId);
            // Update post in UI
            setPosts(posts.map(p => p.id === postId ? updatedPost : p));
        } catch (err) {
            console.error("Failed to dislike post:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to dislike post";
            alert(errorMessage);
        }
    };

    const toggleComments = async (postId: string) => {
        const isCurrentlyShowing = showComments[postId];
        
        if (!isCurrentlyShowing) {
            // Load comments if not already loaded
            if (!comments[postId]) {
                setLoadingComments({ ...loadingComments, [postId]: true });
                try {
                    const result = await getComments(postId);
                    setComments({ ...comments, [postId]: result.comments });
                } catch (err) {
                    console.error("Failed to load comments:", err);
                } finally {
                    setLoadingComments({ ...loadingComments, [postId]: false });
                }
            }
        }
        
        setShowComments({ ...showComments, [postId]: !isCurrentlyShowing });
    };

    const handleSubmitComment = async (postId: string) => {
        const text = commentText[postId]?.trim();
        if (!text) return;

        try {
            const newComment = await createComment(postId, text);
            // Add comment to UI
            setComments({
                ...comments,
                [postId]: [...(comments[postId] || []), newComment]
            });
            // Update comment count on post
            setPosts(posts.map(p => 
                p.id === postId 
                    ? { ...p, comments_count: p.comments_count + 1 }
                    : p
            ));
            // Clear input
            setCommentText({ ...commentText, [postId]: "" });
        } catch (err) {
            console.error("Failed to create comment:", err);
            alert("Failed to create comment");
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) {
            return;
        }

        try {
            await deleteComment(commentId);
            // Remove comment from UI
            setComments({
                ...comments,
                [postId]: comments[postId].filter(c => c.id !== commentId)
            });
            // Update comment count on post
            setPosts(posts.map(p => 
                p.id === postId 
                    ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
                    : p
            ));
        } catch (err) {
            console.error("Failed to delete comment:", err);
            alert("Failed to delete comment. You can only delete your own comments.");
        }
    };

    const handleLikeComment = async (postId: string, commentId: string) => {
        try {
            const updatedComment = await likeComment(commentId);
            setComments({
                ...comments,
                [postId]: (comments[postId] || []).map(c => c.id === commentId ? updatedComment : c)
            });
        } catch (err) {
            console.error("Failed to like comment:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to like comment";
            alert(errorMessage);
        }
    };

    const handleDislikeComment = async (postId: string, commentId: string) => {
        try {
            const updatedComment = await dislikeComment(commentId);
            setComments({
                ...comments,
                [postId]: (comments[postId] || []).map(c => c.id === commentId ? updatedComment : c)
            });
        } catch (err) {
            console.error("Failed to dislike comment:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to dislike comment";
            alert(errorMessage);
        }
    };

    const toggleReplies = async (commentId: string) => {
        const isCurrentlyShowing = showReplies[commentId];

        if (!isCurrentlyShowing) {
            if (!replies[commentId]) {
                setLoadingReplies({ ...loadingReplies, [commentId]: true });
                try {
                    const result = await getCommentReplies(commentId);
                    setReplies({ ...replies, [commentId]: result.replies });
                } catch (err) {
                    console.error("Failed to load replies:", err);
                } finally {
                    setLoadingReplies({ ...loadingReplies, [commentId]: false });
                }
            }
        }

        setShowReplies({ ...showReplies, [commentId]: !isCurrentlyShowing });
    };

    const handleSubmitReply = async (postId: string, commentId: string) => {
        const text = replyText[commentId]?.trim();
        if (!text) return;

        try {
            const newReply = await createCommentReply(commentId, text);
            setReplies({
                ...replies,
                [commentId]: [...(replies[commentId] || []), newReply]
            });
            setComments({
                ...comments,
                [postId]: (comments[postId] || []).map(c =>
                    c.id === commentId
                        ? { ...c, replies_count: c.replies_count + 1 }
                        : c
                )
            });
            setReplyText({ ...replyText, [commentId]: "" });
            setShowReplies({ ...showReplies, [commentId]: true });
        } catch (err) {
            console.error("Failed to create reply:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to create reply";
            alert(errorMessage);
        }
    };

    const handleDeleteReply = async (postId: string, commentId: string, replyId: string) => {
        if (!confirm("Are you sure you want to delete this reply?")) {
            return;
        }

        try {
            await deleteCommentReply(replyId);
            setReplies({
                ...replies,
                [commentId]: (replies[commentId] || []).filter(r => r.id !== replyId)
            });
            setComments({
                ...comments,
                [postId]: (comments[postId] || []).map(c =>
                    c.id === commentId
                        ? { ...c, replies_count: Math.max(0, c.replies_count - 1) }
                        : c
                )
            });
        } catch (err) {
            console.error("Failed to delete reply:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to delete reply";
            alert(errorMessage);
        }
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

                {/* Like/Dislike Section */}
                <div className="mt-3 flex items-center gap-4 text-sm">
                    {/* Like Button */}
                    <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                            post.user_reaction === "like"
                                ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                        <svg
                            className="w-5 h-5"
                            fill={post.user_reaction === "like" ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth={post.user_reaction === "like" ? "0" : "2"}
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        <span className="font-mono">{post.likes}</span>
                    </button>

                    {/* Dislike Button */}
                    <button
                        type="button"
                        onClick={() => handleDislikePost(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                            post.user_reaction === "dislike"
                                ? "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                        <svg
                            className="w-5 h-5 rotate-180"
                            fill={post.user_reaction === "dislike" ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth={post.user_reaction === "dislike" ? "0" : "2"}
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        <span className="font-mono">{post.dislikes}</span>
                    </button>

                    {/* Delete Button - only show for own posts */}
                    {myAnonId && post.anon_id === myAnonId && (
                        <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="ml-auto text-slate-400 dark:text-green-300/50 hover:text-red-600 dark:hover:text-red-400 transition"
                        >
                            🗑️ delete
                        </button>
                    )}
                </div>

                {/* Comment Toggle Button */}
                <div className="mt-3">
                    <button
                        type="button"
                        onClick={() => toggleComments(post.id)}
                        className="text-sm text-slate-500 dark:text-green-300/60 hover:text-slate-700 dark:hover:text-green-300 font-mono transition"
                    >
                        {showComments[post.id] ? '▼' : '▶'} {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
                    </button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                    <div className="mt-3 border-t border-slate-200 dark:border-green-300/20 pt-3">
                        {/* Comment Input */}
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={commentText[post.id] || ""}
                                onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmitComment(post.id);
                                    }
                                }}
                                placeholder="Write a comment..."
                                maxLength={500}
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-green-300/30 bg-white dark:bg-black text-slate-800 dark:text-green-300 placeholder-slate-400 dark:placeholder-green-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-green-300/50"
                            />
                            <button
                                type="button"
                                onClick={() => handleSubmitComment(post.id)}
                                disabled={!commentText[post.id]?.trim()}
                                className="px-4 py-2 text-sm font-mono rounded-lg bg-emerald-500 dark:bg-green-300/10 text-white dark:text-green-300 hover:bg-emerald-600 dark:hover:bg-green-300/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Post
                            </button>
                        </div>

                        {/* Comment Filter */}
                        {(comments[post.id] || []).length > 0 && (
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-green-300/10">
                                <span className="text-xs font-mono text-slate-500 dark:text-green-300/60">
                                    {comments[post.id].length} comment{comments[post.id].length !== 1 ? 's' : ''}
                                </span>
                                <div className="relative">
                                    <select
                                        value={commentSort[post.id] || 'newest'}
                                        onChange={(e) => setCommentSort({ ...commentSort, [post.id]: e.target.value as 'newest' | 'oldest' })}
                                        className="px-3 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-green-300/30 bg-white dark:bg-black text-slate-700 dark:text-green-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-green-300/50 cursor-pointer"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Comments List */}
                        {loadingComments[post.id] ? (
                            <div className="text-sm text-slate-400 dark:text-green-300/50 font-mono">Loading comments...</div>
                        ) : (
                            <div className="space-y-2">
                                {(comments[post.id] || [])
                                    .sort((a, b) => {
                                        const sortOrder = commentSort[post.id] || 'newest';
                                        const dateA = new Date(a.created_at).getTime();
                                        const dateB = new Date(b.created_at).getTime();
                                        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                                    })
                                    .map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-green-300/10"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="text-xs font-mono text-slate-500 dark:text-green-300/60 mb-1">
                                                    User #{comment.anon_id.substring(0, 8)} • {timeAgo(comment.created_at)}
                                                </div>
                                                <div className="text-sm text-slate-800 dark:text-green-300 break-words">
                                                    {comment.text}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2 text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleLikeComment(post.id, comment.id)}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                                                            comment.user_reaction === "like"
                                                                ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold"
                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        }`}
                                                    >
                                                        <span>👍</span>
                                                        <span className="font-mono">{comment.likes}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDislikeComment(post.id, comment.id)}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                                                            comment.user_reaction === "dislike"
                                                                ? "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold"
                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        }`}
                                                    >
                                                        <span>👎</span>
                                                        <span className="font-mono">{comment.dislikes}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleReplies(comment.id)}
                                                        className="ml-2 text-slate-500 dark:text-green-300/60 hover:text-slate-700 dark:hover:text-green-300 font-mono transition"
                                                    >
                                                        {showReplies[comment.id] ? "Hide" : "Reply"}
                                                        {comment.replies_count > 0 ? ` (${comment.replies_count})` : ""}
                                                    </button>
                                                </div>

                                                {showReplies[comment.id] && (
                                                    <div className="mt-3 pl-3 border-l border-slate-200 dark:border-green-300/20">
                                                        <div className="flex gap-2 mb-2">
                                                            <input
                                                                type="text"
                                                                value={replyText[comment.id] || ""}
                                                                onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleSubmitReply(post.id, comment.id);
                                                                    }
                                                                }}
                                                                placeholder="Write a reply..."
                                                                maxLength={500}
                                                                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-green-300/30 bg-white dark:bg-black text-slate-800 dark:text-green-300 placeholder-slate-400 dark:placeholder-green-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-green-300/50"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSubmitReply(post.id, comment.id)}
                                                                disabled={!replyText[comment.id]?.trim()}
                                                                className="px-3 py-2 text-xs font-mono rounded-lg bg-emerald-500 dark:bg-green-300/10 text-white dark:text-green-300 hover:bg-emerald-600 dark:hover:bg-green-300/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                            >
                                                                Reply
                                                            </button>
                                                        </div>

                                                        {loadingReplies[comment.id] ? (
                                                            <div className="text-xs text-slate-400 dark:text-green-300/50 font-mono">Loading replies...</div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {(replies[comment.id] || []).map((reply) => (
                                                                    <div
                                                                        key={reply.id}
                                                                        className="p-2 rounded-lg bg-white dark:bg-black border border-slate-200 dark:border-green-300/10"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="flex-1">
                                                                                <div className="text-[11px] font-mono text-slate-500 dark:text-green-300/60 mb-1">
                                                                                    User #{reply.anon_id.substring(0, 8)} • {timeAgo(reply.created_at)}
                                                                                </div>
                                                                                <div className="text-xs text-slate-800 dark:text-green-300 break-words">
                                                                                    {reply.text}
                                                                                </div>
                                                                            </div>
                                                                            {myAnonId && reply.anon_id === myAnonId && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDeleteReply(post.id, comment.id, reply.id)}
                                                                                    className="text-slate-400 dark:text-green-300/50 hover:text-red-600 dark:hover:text-red-400 text-[11px] transition"
                                                                                >
                                                                                    🗑️
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Delete button - only show for own comments */}
                                            {myAnonId && comment.anon_id === myAnonId && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                                    className="text-slate-400 dark:text-green-300/50 hover:text-red-600 dark:hover:text-red-400 text-xs transition"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

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
