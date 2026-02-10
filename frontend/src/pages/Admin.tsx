import { useEffect, useMemo, useState } from "react";
import {
    clearAdminKey,
    deleteAdminPost,
    fetchAdminAbuse,
    fetchAdminAudit,
    fetchAdminHealth,
    fetchAdminPosts,
    fetchAdminSessions,
    fetchAdminStats,
    fetchAdminTrust,
    fetchAdminUsers,
    getAdminKey,
    setAdminKey,
    type AbuseReport,
    type AdminPost,
    type AdminSession,
    type AdminStats,
    type AdminUser,
    type AuditLog,
    type TrustLink,
} from "../services/adminApi";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4";

export default function Admin() {
    const [adminKeyInput, setAdminKeyInput] = useState(() => getAdminKey() ?? "");
    const [hasKey, setHasKey] = useState(() => Boolean(getAdminKey()));

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [health, setHealth] = useState<{ status: string; timestamp: string; uptime: string } | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [sessions, setSessions] = useState<AdminSession[]>([]);
    const [trustLinks, setTrustLinks] = useState<TrustLink[]>([]);
    const [abuse, setAbuse] = useState<AbuseReport[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    const trustSummary = useMemo(() => {
        const summary = { pending: 0, accepted: 0, declined: 0 };
        for (const t of trustLinks) {
            if (t.status === "pending") summary.pending += 1;
            else if (t.status === "accepted") summary.accepted += 1;
            else if (t.status === "declined") summary.declined += 1;
        }
        return summary;
    }, [trustLinks]);

    const loadAll = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [healthRes, statsRes, postsRes, usersRes, sessionsRes, trustRes, abuseRes, auditRes] =
                await Promise.all([
                    fetchAdminHealth(),
                    fetchAdminStats(),
                    fetchAdminPosts(),
                    fetchAdminUsers(),
                    fetchAdminSessions(),
                    fetchAdminTrust(),
                    fetchAdminAbuse(),
                    fetchAdminAudit(),
                ]);

            setHealth(healthRes);
            setStats(statsRes);
            setPosts(postsRes.posts);
            setUsers(usersRes.users);
            setSessions(sessionsRes.sessions);
            setTrustLinks(trustRes.trust_links);
            setAbuse(abuseRes.abuse_reports);
            setAuditLogs(auditRes.logs);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to load admin data";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasKey) {
            loadAll();
        }
    }, [hasKey]);

    const handleSaveKey = () => {
        const trimmed = adminKeyInput.trim();
        if (!trimmed) {
            setError("Admin key is required");
            return;
        }
        setAdminKey(trimmed);
        setHasKey(true);
    };

    const handleClearKey = () => {
        clearAdminKey();
        setHasKey(false);
        setHealth(null);
        setStats(null);
        setPosts([]);
        setUsers([]);
        setSessions([]);
        setTrustLinks([]);
        setAbuse([]);
        setAuditLogs([]);
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Delete this post? This action is logged.")) return;
        try {
            await deleteAdminPost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            const [statsRes, auditRes] = await Promise.all([fetchAdminStats(), fetchAdminAudit()]);
            setStats(statsRes);
            setAuditLogs(auditRes.logs);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to delete post";
            setError(msg);
        }
    };

    const maskToken = (token: string) => {
        if (token.length <= 10) return token;
        return `${token.slice(0, 6)}...${token.slice(-4)}`;
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Admin Panel</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Moderation, system health, and compliance monitoring
                </p>
            </div>

            <div className={card}>
                <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                    Admin Access
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <label className="flex-1">
                        <div className="text-xs font-mono text-slate-600 dark:text-green-300/70 mb-1">
                            Admin key
                        </div>
                        <input
                            type="password"
                            value={adminKeyInput}
                            onChange={(e) => setAdminKeyInput(e.target.value)}
                            placeholder="Enter ADMIN_KEY"
                            className="w-full rounded-xl bg-white/60 dark:bg-black/40 border border-emerald-500/25 dark:border-green-500/25 px-3 py-2 text-sm text-slate-900 dark:text-green-100 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-green-500/30"
                        />
                    </label>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSaveKey}
                            className="rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={handleClearKey}
                            className="rounded-xl px-4 py-2 text-sm font-mono border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-green-500/20 dark:text-green-300/80 dark:hover:bg-green-500/10"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={loadAll}
                            disabled={!hasKey || isLoading}
                            className="rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-3 text-sm text-red-600 dark:text-red-400 font-mono">{error}</div>
                )}
            </div>

            {hasKey && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className={card}>
                            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                                System Health
                            </div>
                            <div className="text-sm text-slate-800 dark:text-green-200">
                                Status: <span className="font-mono">{health?.status ?? "unknown"}</span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-green-300/70 mt-1">
                                Uptime: {health?.uptime ?? "-"}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-green-300/70">
                                Time: {health?.timestamp ?? "-"}
                            </div>
                        </div>

                        <div className={card}>
                            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                                Network Summary
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm text-slate-800 dark:text-green-200">
                                <div>Posts: <span className="font-mono">{stats?.total_posts ?? 0}</span></div>
                                <div>Users: <span className="font-mono">{stats?.total_users ?? 0}</span></div>
                                <div>Sessions: <span className="font-mono">{stats?.total_sessions ?? 0}</span></div>
                                <div>Avg/day: <span className="font-mono">{stats?.avg_posts_per_day?.toFixed(1) ?? "0.0"}</span></div>
                            </div>
                        </div>

                        <div className={card}>
                            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                                Trust Graph Monitor
                            </div>
                            <div className="text-sm text-slate-800 dark:text-green-200">
                                Pending: <span className="font-mono">{trustSummary.pending}</span>
                            </div>
                            <div className="text-sm text-slate-800 dark:text-green-200">
                                Accepted: <span className="font-mono">{trustSummary.accepted}</span>
                            </div>
                            <div className="text-sm text-slate-800 dark:text-green-200">
                                Declined: <span className="font-mono">{trustSummary.declined}</span>
                            </div>
                        </div>
                    </div>

                    <div className={card}>
                        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                            Abuse and Rate-Limit Dashboard
                        </div>
                        <div className="text-xs text-slate-600 dark:text-green-300/70 mb-2">
                            Highlights accounts with abnormal posting volume. No IP data is collected.
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-600 dark:text-green-300/70">
                                    <tr>
                                        <th className="text-left py-2">Anon ID</th>
                                        <th className="text-left py-2">Posts</th>
                                        <th className="text-left py-2">Last Post</th>
                                        <th className="text-left py-2">Rate Status</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-800 dark:text-green-200">
                                    {abuse.slice(0, 20).map((r) => (
                                        <tr key={r.anon_id} className="border-t border-emerald-500/10 dark:border-green-500/10">
                                            <td className="py-2 font-mono">{r.anon_id.slice(0, 8)}</td>
                                            <td className="py-2 font-mono">{r.post_count}</td>
                                            <td className="py-2">{r.last_post_at || "-"}</td>
                                            <td className="py-2 font-mono">{r.rate_status}</td>
                                        </tr>
                                    ))}
                                    {abuse.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-3 text-slate-500 dark:text-green-300/50">
                                                No abuse signals detected.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={card}>
                        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                            Posts Moderation
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-600 dark:text-green-300/70">
                                    <tr>
                                        <th className="text-left py-2">Post</th>
                                        <th className="text-left py-2">Anon ID</th>
                                        <th className="text-left py-2">Created</th>
                                        <th className="text-left py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-800 dark:text-green-200">
                                    {posts.slice(0, 50).map((p) => (
                                        <tr key={p.id} className="border-t border-emerald-500/10 dark:border-green-500/10">
                                            <td className="py-2 max-w-md">
                                                <div className="text-slate-900 dark:text-green-100 line-clamp-2">{p.text}</div>
                                            </td>
                                            <td className="py-2 font-mono">{p.anon_id.slice(0, 8)}</td>
                                            <td className="py-2 text-xs">{p.created_at}</td>
                                            <td className="py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePost(p.id)}
                                                    className="rounded-lg px-3 py-1 border border-red-400/40 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {posts.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-3 text-slate-500 dark:text-green-300/50">
                                                No posts found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className={card}>
                            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                                Users Overview
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-600 dark:text-green-300/70">
                                        <tr>
                                            <th className="text-left py-2">Anon ID</th>
                                            <th className="text-left py-2">Posts</th>
                                            <th className="text-left py-2">First Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-800 dark:text-green-200">
                                        {users.slice(0, 20).map((u) => (
                                            <tr key={u.anon_id} className="border-t border-emerald-500/10 dark:border-green-500/10">
                                                <td className="py-2 font-mono">{u.anon_id.slice(0, 8)}</td>
                                                <td className="py-2 font-mono">{u.post_count}</td>
                                                <td className="py-2 text-xs">{u.created_at}</td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-3 text-slate-500 dark:text-green-300/50">
                                                    No users found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={card}>
                            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                                Session Overview
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-600 dark:text-green-300/70">
                                        <tr>
                                            <th className="text-left py-2">Anon ID</th>
                                            <th className="text-left py-2">Token</th>
                                            <th className="text-left py-2">Expires</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-800 dark:text-green-200">
                                        {sessions.slice(0, 20).map((s) => (
                                            <tr key={s.token} className="border-t border-emerald-500/10 dark:border-green-500/10">
                                                <td className="py-2 font-mono">{s.anon_id.slice(0, 8)}</td>
                                                <td className="py-2 font-mono">{maskToken(s.token)}</td>
                                                <td className="py-2 text-xs">{s.expires_at}</td>
                                            </tr>
                                        ))}
                                        {sessions.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-3 text-slate-500 dark:text-green-300/50">
                                                    No sessions recorded.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className={card}>
                        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                            Trust Graph Links
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-600 dark:text-green-300/70">
                                    <tr>
                                        <th className="text-left py-2">From</th>
                                        <th className="text-left py-2">To</th>
                                        <th className="text-left py-2">Status</th>
                                        <th className="text-left py-2">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-800 dark:text-green-200">
                                    {trustLinks.slice(0, 25).map((t, idx) => (
                                        <tr key={`${t.from}-${t.to}-${idx}`} className="border-t border-emerald-500/10 dark:border-green-500/10">
                                            <td className="py-2 font-mono">{t.from.slice(0, 8)}</td>
                                            <td className="py-2 font-mono">{t.to.slice(0, 8)}</td>
                                            <td className="py-2 font-mono">{t.status}</td>
                                            <td className="py-2 text-xs">{t.created_at}</td>
                                        </tr>
                                    ))}
                                    {trustLinks.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-3 text-slate-500 dark:text-green-300/50">
                                                No trust links recorded.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={card}>
                        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
                            Audit and Compliance Log
                        </div>
                        <div className="text-xs text-slate-600 dark:text-green-300/70 mb-2">
                            Tracks admin moderation actions for accountability.
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-600 dark:text-green-300/70">
                                    <tr>
                                        <th className="text-left py-2">Action</th>
                                        <th className="text-left py-2">Actor</th>
                                        <th className="text-left py-2">Details</th>
                                        <th className="text-left py-2">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-800 dark:text-green-200">
                                    {auditLogs.slice(0, 50).map((log) => (
                                        <tr key={log.id} className="border-t border-emerald-500/10 dark:border-green-500/10">
                                            <td className="py-2 font-mono">{log.action}</td>
                                            <td className="py-2 font-mono">{log.anon_id}</td>
                                            <td className="py-2 text-xs">{log.details}</td>
                                            <td className="py-2 text-xs">{log.timestamp}</td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-3 text-slate-500 dark:text-green-300/50">
                                                No audit events recorded.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
