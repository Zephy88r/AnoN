import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TrustRequestModal from "../components/TrustRequestModal";
import { useTrust } from "../contexts/TrustContext";
import { ensureThreadForPeer } from "../services/thread";
import { createPost, fetchFeed, deletePost, likePost, dislikePost, getRemainingPosts, createComment, getComments, deleteComment, likeComment, dislikeComment, createCommentReply, getCommentReplies, deleteCommentReply, likeCommentReply, dislikeCommentReply, searchPosts } from "../services/postsApi";
import type { ApiPost, ApiComment, ApiCommentReply, ApiSearchResult } from "../services/postsApi";
import { getMyAnonId } from "../services/session";

export default function HomeFeed() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [hoveredReplyId, setHoveredReplyId] = useState<number | null>(null);
    const [posts, setPosts] = useState<ApiPost[]>([]);
    const [postText, setPostText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [postsLeftToday, setPostsLeftToday] = useState(3);
    const [myAnonId, setMyAnonId] = useState<string | null>(null);

    // Search state
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ApiSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTotalCount, setSearchTotalCount] = useState(0);

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

    // Check URL params for search mode
    useEffect(() => {
        const shouldSearch = searchParams.get('search') === 'true';
        if (shouldSearch && !searchMode) {
            setSearchMode(true);
        } else if (!shouldSearch && searchMode) {
            setSearchMode(false);
        }
    }, [searchParams, searchMode]);

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

                // Load comments for all posts to show accurate comment counts
                const commentsMap: Record<string, ApiComment[]> = {};
                for (const post of feedResult.posts) {
                    try {
                        const result = await getComments(post.id);
                        commentsMap[post.id] = result.comments;
                    } catch (err) {
                        console.error(`Failed to load comments for post ${post.id}:`, err);
                        commentsMap[post.id] = [];
                    }
                }
                setComments(commentsMap);
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
            // Initialize empty comments for the new post
            setComments({ [response.post.id]: [], ...comments });
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
            setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
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
            setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
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
        } catch (err) {
            console.error("Failed to delete comment:", err);
            alert("Failed to delete comment. You can only delete your own comments.");
        }
    };

    const handleLikeComment = async (postId: string, commentId: string) => {
        try {
            const updatedComment = await likeComment(commentId);
            setComments(prev => ({
                ...prev,
                [postId]: (prev[postId] || []).map(c => c.id === commentId ? updatedComment : c)
            }));
        } catch (err) {
            console.error("Failed to like comment:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to like comment";
            alert(errorMessage);
        }
    };

    const handleDislikeComment = async (postId: string, commentId: string) => {
        try {
            const updatedComment = await dislikeComment(commentId);
            setComments(prev => ({
                ...prev,
                [postId]: (prev[postId] || []).map(c => c.id === commentId ? updatedComment : c)
            }));
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
                        ? { ...c, replies_count: (c.replies_count || 0) + 1 }
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
                        ? { ...c, replies_count: Math.max(0, (c.replies_count || 0) - 1) }
                        : c
                )
            });
        } catch (err) {
            console.error("Failed to delete reply:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to delete reply";
            alert(errorMessage);
        }
    };

    const handleLikeReply = async (commentId: string, replyId: string) => {
        try {
            console.log('[Like Reply] Liking reply:', replyId, 'in comment:', commentId);
            const updatedReply = await likeCommentReply(replyId);
            console.log('[Like Reply] Response:', updatedReply);
            setReplies(prev => ({
                ...prev,
                [commentId]: (prev[commentId] || []).map(r => r.id === replyId ? updatedReply : r)
            }));
        } catch (err) {
            console.error("Failed to like reply:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to like reply";
            alert(errorMessage);
        }
    };

    const handleDislikeReply = async (commentId: string, replyId: string) => {
        try {
            console.log('[Dislike Reply] Disliking reply:', replyId, 'in comment:', commentId);
            const updatedReply = await dislikeCommentReply(replyId);
            console.log('[Dislike Reply] Response:', updatedReply);
            setReplies(prev => ({
                ...prev,
                [commentId]: (prev[commentId] || []).map(r => r.id === replyId ? updatedReply : r)
            }));
        } catch (err) {
            console.error("Failed to dislike reply:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to dislike reply";
            alert(errorMessage);
        }
    };

    const handleReplyClick = (commentId: string, anonId: string) => {
        const mention = `@${anonId.substring(0, 8)} `;
        setReplyText({ ...replyText, [commentId]: mention });
        // Focus the reply input
        setTimeout(() => {
            const input = document.getElementById(`reply-input-${commentId}`) as HTMLInputElement;
            if (input) {
                input.focus();
                input.setSelectionRange(mention.length, mention.length);
            }
        }, 100);
    };

    // Function to render text with mentions highlighted
    const renderTextWithMentions = (text: string) => {
        // Match @userid pattern (8 characters after @)
        const mentionRegex = /@(\w{8})/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            // Add text before mention
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            // Add mention with styling
            parts.push(
                <span 
                    key={match.index} 
                    className="text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Could add user profile view here
                    }}
                >
                    {match[0]}
                </span>
            );
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };


    // Search handlers
    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) {
            alert("Search query cannot be empty");
            return;
        }

        setIsSearching(true);
        try {
            console.log('[Search] Searching for:', query);
            const response = await searchPosts(query, 50, 0);
            console.log('[Search] Response:', response);
            setSearchResults(response.results);
            setSearchTotalCount(response.total_count || 0);
        } catch (err) {
            console.error("[Search] Search failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            alert(`Search failed: ${errorMessage}`);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const clearSearch = () => {
        setSearchMode(false);
        setSearchQuery("");
        setSearchResults([]);
        setSearchTotalCount(0);
        // Remove search param from URL
        searchParams.delete('search');
        setSearchParams(searchParams);
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-0">
            
        {/* Header */}
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                {searchMode ? "Search Network" : "Feed"}
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                {searchMode ? "Search posts by keywords or hashtags" : "Anonymous network feed"}
                </p>
            </div>

            {searchMode ? (
                <button
                    onClick={clearSearch}
                    className="rounded-full border border-emerald-500/30 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 px-4 py-1.5 text-sm font-mono text-emerald-800 dark:text-green-300 hover:bg-emerald-500/20 dark:hover:bg-green-500/20 transition-colors"
                >
                    ← Back to Feed
                </button>
            ) : (
                <div className="rounded-full border border-emerald-600/30 dark:border-green-500/30 bg-white/60 dark:bg-black/20 px-3 py-1 text-sm font-mono text-emerald-800 dark:text-green-300">
                    {postsLeftToday} posts left
                </div>
            )}
            </div>
        </div>

        {/* Search Bar */}
        {searchMode && (
            <div className="rounded-2xl border border-emerald-500/30 dark:border-green-500/30 bg-white/80 dark:bg-black/60 backdrop-blur-xl p-5 space-y-3 shadow-lg shadow-emerald-500/5 dark:shadow-green-500/5">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search . . . . ."
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-emerald-500/30 dark:border-green-500/30 bg-white dark:bg-black text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-300/50 outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-green-500/50 focus:border-emerald-500/50 dark:focus:border-green-500/50 transition-all"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-6 py-3 rounded-xl font-mono border-2 border-emerald-500/40 dark:border-green-500/40 bg-emerald-500/15 dark:bg-green-500/15 text-emerald-800 dark:text-green-300 hover:bg-emerald-500/25 dark:hover:bg-green-500/25 hover:border-emerald-500/60 dark:hover:border-green-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                    >
                        {isSearching ? "Searching..." : "Search"}
                    </button>
                </div>
                <div className="text-xs text-slate-600 dark:text-green-300/60 font-mono">
                    💡 Try: "hero" • "#fun" • "hero #fun" • "#programming #tutorial"
                </div>
                {searchTotalCount > 0 && (
                    <div className="text-sm font-mono text-emerald-600 dark:text-green-300">
                        Found {searchTotalCount} result{searchTotalCount !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
        )}

        {/* Post Composer - Only show when NOT in search mode */}
        {!searchMode && (
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
        )}

        {/* Posts or Search Results */}
        {searchMode ? (
            // Search Results
            searchResults.length === 0 && !isSearching ? (
                <div className="text-center py-8 text-slate-600 dark:text-green-300/70">
                    {searchQuery ? "No results found. Try a different search query." : "Enter a search query above"}
                </div>
            ) : (
                <div className="space-y-4">
                    {searchResults.map((result) => {
                        const post = result.post;
                        const userKey = `user_${post.anon_id.substring(0, 8)}`;
                        const status = getStatusForUser(userKey);

                        const timeAgo = (isoDate: string) => {
                            const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
                            if (minutes < 1) return "just now";
                            if (minutes < 60) return `${minutes}m ago`;
                            const hours = Math.floor(minutes / 60);
                            if (hours < 24) return `${hours}h ago`;
                            return `${Math.floor(hours / 24)}d ago`;
                        };

                        return (
                            <div
                                key={post.id}
                                className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4 space-y-3"
                            >
                                {/* Post Header */}
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                                        User #{post.anon_id.substring(0, 8)}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                                            {timeAgo(post.created_at)}
                                        </span>
                                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-green-500/10 text-emerald-700 dark:text-green-400 border border-emerald-500/20 dark:border-green-500/20">
                                            Score: {result.relevance_score.toFixed(1)}
                                        </span>
                                    </div>
                                </div>

                                {/* Post Content */}
                                <p className="text-slate-800 dark:text-green-100 leading-relaxed">
                                    {post.text}
                                </p>

                                {/* Matched Terms */}
                                {result.matched_terms && result.matched_terms.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {result.matched_terms.map((term, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 rounded-md text-xs font-mono bg-emerald-500/10 dark:bg-green-500/10 text-emerald-700 dark:text-green-300 border border-emerald-500/20 dark:border-green-500/20"
                                            >
                                                {term.startsWith('#') ? term : `"${term}"`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Like/Dislike Section */}
                                <div className="mt-3 flex items-center gap-4 text-sm pt-2 border-t border-slate-200 dark:border-green-300/10">
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
                                            className="w-5 h-5"
                                            fill={post.user_reaction === "dislike" ? "currentColor" : "none"}
                                            stroke="currentColor"
                                            strokeWidth={post.user_reaction === "dislike" ? "0" : "2"}
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                                        </svg>
                                        <span className="font-mono">{Math.max(0, post.dislikes)}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
        ) : (
        // Regular Feed
        isLoading ? (
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
                <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-4">
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
                                className="w-5 h-5"
                                fill={post.user_reaction === "dislike" ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth={post.user_reaction === "dislike" ? "0" : "2"}
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                            </svg>
                            <span className="font-mono">{Math.max(0, post.dislikes)}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Comment Counter Badge */}
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 font-mono text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            onClick={() => toggleComments(post.id)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <span>{
                                (comments[post.id]?.length || 0) + 
                                (comments[post.id]?.reduce((sum, c) => sum + (c.replies_count || 0), 0) || 0)
                            }</span>
                        </div>

                        {/* Delete Button - only show for own posts */}
                        {myAnonId && post.anon_id === myAnonId && (
                            <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="text-slate-400 dark:text-green-300/50 hover:text-red-600 dark:hover:text-red-400 transition"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>

                {/* Comment Toggle Button */}
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={() => toggleComments(post.id)}
                        className="text-sm text-slate-500 dark:text-green-300/60 hover:text-slate-700 dark:hover:text-green-300 font-mono transition"
                    >
                        {showComments[post.id] ? '▼ Hide comments' : '▶ Show comments'}
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
                                    {(() => {
                                        const totalCount = (comments[post.id]?.length || 0) + 
                                            (comments[post.id]?.reduce((sum, c) => sum + (c.replies_count || 0), 0) || 0);
                                        return `${totalCount} comment${totalCount !== 1 ? 's' : ''}`;
                                    })()}
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
                                                    {renderTextWithMentions(comment.text)}
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            handleLikeComment(post.id, comment.id);
                                                        }}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                                                            comment.user_reaction === "like"
                                                                ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold"
                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        }`}
                                                    >
                                                        <svg
                                                            className="w-5 h-5"
                                                            fill={comment.user_reaction === "like" ? "currentColor" : "none"}
                                                            stroke="currentColor"
                                                            strokeWidth={comment.user_reaction === "like" ? "0" : "2"}
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                                        </svg>
                                                        <span className="font-mono">{comment.likes}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            handleDislikeComment(post.id, comment.id);
                                                        }}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                                                            comment.user_reaction === "dislike"
                                                                ? "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold"
                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        }`}
                                                    >
                                                        <svg
                                                            className="w-5 h-5"
                                                            fill={comment.user_reaction === "dislike" ? "currentColor" : "none"}
                                                            stroke="currentColor"
                                                            strokeWidth={comment.user_reaction === "dislike" ? "0" : "2"}
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                                                        </svg>
                                                        <span className="font-mono">{Math.max(0, comment.dislikes)}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!showReplies[comment.id]) {
                                                                toggleReplies(comment.id);
                                                                handleReplyClick(comment.id, comment.anon_id);
                                                            } else {
                                                                toggleReplies(comment.id);
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono transition"
                                                    >
                                                        {showReplies[comment.id] ? "Hide" : "Reply"}
                                                        {comment.replies_count > 0 ? ` (${comment.replies_count})` : ""}
                                                    </button>
                                                </div>

                                                {showReplies[comment.id] && (
                                                    <div className="mt-3 pl-3 border-l border-slate-200 dark:border-green-300/20">
                                                        <div className="flex gap-2 mb-2">
                                                            <input
                                                                id={`reply-input-${comment.id}`}
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
                                                            <div className="text-sm text-slate-400 dark:text-green-300/50 font-mono">Loading replies...</div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {(replies[comment.id] || []).map((reply) => (
                                                                    <div
                                                                        key={reply.id}
                                                                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-green-300/10"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="flex-1">
                                                                                <div className="text-xs font-mono text-slate-500 dark:text-green-300/60 mb-1">
                                                                                    User #{reply.anon_id.substring(0, 8)} • {timeAgo(reply.created_at)}
                                                                                </div>
                                                                                <div className="text-sm text-slate-800 dark:text-green-300 break-words">
                                                                                    {renderTextWithMentions(reply.text)}
                                                                                </div>
                                                                                <div className="mt-2 flex items-center gap-3 text-xs">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(event) => {
                                                                                            event.preventDefault();
                                                                                            event.stopPropagation();
                                                                                            handleLikeReply(comment.id, reply.id);
                                                                                        }}
                                                                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                                                                                            reply.user_reaction === "like"
                                                                                                ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold"
                                                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                                        }`}
                                                                                    >
                                                                                        <svg
                                                                                            className="w-4 h-4"
                                                                                            fill={reply.user_reaction === "like" ? "currentColor" : "none"}
                                                                                            stroke="currentColor"
                                                                                            strokeWidth={reply.user_reaction === "like" ? "0" : "2"}
                                                                                            viewBox="0 0 24 24"
                                                                                        >
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                                                                        </svg>
                                                                                        <span className="font-mono">{reply.likes}</span>
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(event) => {
                                                                                            event.preventDefault();
                                                                                            event.stopPropagation();
                                                                                            handleDislikeReply(comment.id, reply.id);
                                                                                        }}
                                                                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                                                                                            reply.user_reaction === "dislike"
                                                                                                ? "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold"
                                                                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                                        }`}
                                                                                    >
                                                                                        <svg
                                                                                            className="w-4 h-4"
                                                                                            fill={reply.user_reaction === "dislike" ? "currentColor" : "none"}
                                                                                            stroke="currentColor"
                                                                                            strokeWidth={reply.user_reaction === "dislike" ? "0" : "2"}
                                                                                            viewBox="0 0 24 24"
                                                                                        >
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                                                                                        </svg>
                                                                                        <span className="font-mono">{Math.max(0, reply.dislikes)}</span>
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleReplyClick(comment.id, reply.anon_id)}
                                                                                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-green-300/70 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono transition"
                                                                                    >
                                                                                        Reply
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            {myAnonId && reply.anon_id === myAnonId && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDeleteReply(post.id, comment.id, reply.id)}
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
        </div>
        ))}
        
        {/* Trust Request Modal */}
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
