import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { fetchAdminPostDetail, type AdminPostDetail } from "../services/adminApi";
import { formatAdminTime } from "../utils/formatTime";

interface PostDetailModalProps {
    open: boolean;
    postId: string | null;
    onClose: () => void;
    reportCount?: number;
}

export default function PostDetailModal({ open, postId, onClose, reportCount = 0 }: PostDetailModalProps) {
    const [post, setPost] = useState<AdminPostDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !postId) {
            setPost(null);
            setError(null);
            return;
        }

        const loadPost = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetchAdminPostDetail(postId);
                setPost(response.post);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to load post details";
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [open, postId]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-xl">
                <div className="flex items-center justify-between border-b border-emerald-500/20 dark:border-green-500/20 p-4">
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-green-100">Post Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 dark:text-green-300/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {loading && (
                        <div className="text-center py-8">
                            <div className="w-6 h-6 rounded-full border-2 border-emerald-500/20 dark:border-green-500/20 border-t-emerald-500 dark:border-t-green-500 animate-spin mx-auto" />
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {post && (
                        <>
                            {/* Post ID */}
                            <div>
                                <label className="text-xs font-mono text-slate-500 dark:text-green-300/60">Post ID</label>
                                <p className="font-mono text-sm text-slate-700 dark:text-green-100 break-all">
                                    {post.id.slice(0, 8)}...
                                </p>
                            </div>

                            {/* Author */}
                            <div>
                                <label className="text-xs font-mono text-slate-500 dark:text-green-300/60">Author</label>
                                <p className="font-mono text-sm text-slate-700 dark:text-green-100">
                                    {post.anon_id.slice(0, 8)}...
                                </p>
                            </div>

                            {/* Created At */}
                            <div>
                                <label className="text-xs font-mono text-slate-500 dark:text-green-300/60">Created</label>
                                <p className="text-sm text-slate-700 dark:text-green-100">
                                    {formatAdminTime(post.created_at)}
                                </p>
                            </div>

                            {/* Content */}
                            <div>
                                <label className="text-xs font-mono text-slate-500 dark:text-green-300/60">Content</label>
                                <p className="text-sm text-slate-700 dark:text-green-100 break-words bg-slate-50 dark:bg-slate-800/50 rounded p-2 border border-slate-200 dark:border-green-500/10 max-h-48 overflow-y-auto">
                                    {post.text}
                                </p>
                            </div>

                            {/* Reactions */}
                            <div className="flex gap-4 pt-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm">👍</span>
                                    <span className="font-mono text-sm text-slate-600 dark:text-green-300/70">{post.likes}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm">👎</span>
                                    <span className="font-mono text-sm text-slate-600 dark:text-green-300/70">{post.dislikes}</span>
                                </div>
                            </div>

                            {/* Report Count */}
                            {reportCount > 0 && (
                                <div className="pt-2 border-t border-slate-200 dark:border-green-500/10">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">🚩</span>
                                        <span className="font-mono text-sm text-orange-600 dark:text-orange-400">{reportCount} reports</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="border-t border-emerald-500/20 dark:border-green-500/20 p-3 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-mono border border-emerald-500/20 dark:border-green-500/20 text-slate-700 dark:text-green-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
