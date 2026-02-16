import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ClockIcon,
    ShieldCheckIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import AdminLayout from "../components/admin/AdminLayout";
import StatCard from "../components/admin/StatCard";
import Panel from "../components/admin/Panel";
import DataTable from "../components/admin/DataTable";
import SystemHealthPanel from "../components/admin/SystemHealthPanel";
import ConfirmationModal from "../components/ConfirmationModal";
import { formatAdminTime } from "../utils/formatTime";
import {
    clearAdminToken,
    deleteAdminPost,
    fetchAdminAbuse,
    fetchAdminAudit,
    fetchAdminHealth,
    fetchAdminPosts,
    fetchAdminSessions,
    fetchAdminStats,
    fetchAdminTrust,
    fetchAdminUsers,
    getAdminToken,
    revokeSession,
    type AbuseReport,
    type AdminPost,
    type AdminSession,
    type AdminStats,
    type AdminUser,
    type AuditLog,
    type TrustLink,
} from "../services/adminApi";

type AdminPage =
    | "dashboard"
    | "sessions"
    | "users"
    | "trust"
    | "link-cards"
    | "feed"
    | "map"
    | "abuse"
    | "audit";

export default function Admin() {
    const navigate = useNavigate();
    const [hasSession, setHasSession] = useState(() => Boolean(getAdminToken()));
    const [currentPage, setCurrentPage] = useState<AdminPage>("dashboard");

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

    // Filter states
    const [feedFilter, setFeedFilter] = useState("");
    const [usersFilter, setUsersFilter] = useState("");
    const [abuseFilter, setAbuseFilter] = useState("");

    // Revoke session modal state
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [sessionToRevoke, setSessionToRevoke] = useState<{ token: string; anonId: string } | null>(null);

    // Session selection state
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

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
        if (!hasSession) {
            navigate("/admin", { replace: true });
            return;
        }
        loadAll();
    }, [hasSession, navigate]);

    const handleClearKey = () => {
        clearAdminToken();
        setHasSession(false);
        setHealth(null);
        setStats(null);
        setPosts([]);
        setUsers([]);
        setSessions([]);
        setTrustLinks([]);
        setAbuse([]);
        setAuditLogs([]);
        setCurrentPage("dashboard");
        navigate("/admin", { replace: true });
    };

    const handleNavigate = (page: string) => {
        setCurrentPage(page as AdminPage);
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

    const handleRevokeSessionClick = (token: string, anonId: string) => {
        setSessionToRevoke({ token, anonId });
        setRevokeModalOpen(true);
    };

    const handleConfirmRevoke = async () => {
        if (!sessionToRevoke) return;

        try {
            await revokeSession(sessionToRevoke.token);
            setSessions((prev) => prev.filter((s) => s.token !== sessionToRevoke.token));
            const auditRes = await fetchAdminAudit();
            setAuditLogs(auditRes.logs);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to revoke session";
            setError(msg);
        }
    };

    const handleSelectSession = (token: string) => {
        setSelectedSessions((prev) => {
            const next = new Set(prev);
            if (next.has(token)) {
                next.delete(token);
            } else {
                next.add(token);
            }
            return next;
        });
    };

    const handleSelectAllSessions = (isSelected: boolean) => {
        if (isSelected) {
            const allTokens = new Set(sessions.map((s) => s.token));
            setSelectedSessions(allTokens);
        } else {
            setSelectedSessions(new Set());
        }
    };

    const handleBulkRevokeClick = () => {
        setRevokeModalOpen(true);
    };

    const handleConfirmBulkRevoke = async () => {
        if (selectedSessions.size === 0) return;

        try {
            for (const token of selectedSessions) {
                await revokeSession(token);
            }
            setSessions((prev) => prev.filter((s) => !selectedSessions.has(s.token)));
            setSelectedSessions(new Set());
            const auditRes = await fetchAdminAudit();
            setAuditLogs(auditRes.logs);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to revoke sessions";
            setError(msg);
        }
    };

    const maskToken = (token: string) => {
        if (token.length <= 8) return token;
        return `${token.slice(0, 4)}...${token.slice(-4)}`;
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                        Admin Dashboard
                    </h1>
                    <p className="text-sm text-slate-700 dark:text-green-300/70">
                        System overview and key metrics
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadAll}
                    disabled={!hasSession || isLoading}
                    className="rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 dark:border-green-500/30
                        bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-300 
                        hover:bg-emerald-500/20 dark:hover:bg-green-500/20
                        disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 dark:bg-red-500/10 backdrop-blur p-4">
                    <p className="text-sm text-red-600 dark:text-red-400 font-mono">{error}</p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Active Sessions"
                    value={stats?.total_sessions ?? 0}
                    icon={ClockIcon}
                />
                <StatCard
                    title="Trust Requests"
                    value={trustSummary.pending}
                    icon={ShieldCheckIcon}
                />
                <StatCard
                    title="Total Users"
                    value={stats?.total_users ?? 0}
                    icon={ChatBubbleLeftRightIcon}
                />
                <StatCard
                    title="Feed Posts"
                    value={stats?.total_posts ?? 0}
                    icon={DocumentTextIcon}
                />
            </div>

            {/* Second Row: Chart + Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panel title="Posts Activity" description="Average posts per day" className="lg:col-span-2">
                    <div className="h-48 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <p className="text-4xl font-bold text-emerald-600 dark:text-green-400">
                                {stats?.avg_posts_per_day?.toFixed(1) ?? "0.0"}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-green-300/70">
                                Average posts per day
                            </p>
                        </div>
                    </div>
                </Panel>

                <SystemHealthPanel health={health || {}} />
            </div>

            {/* Third Row: Two Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel title="Pending Trust Requests">
                    <DataTable
                        columns={[
                            {
                                key: "from",
                                label: "From",
                                render: (t: TrustLink) => (
                                    <span className="font-mono">{t.from.slice(0, 8)}</span>
                                ),
                            },
                            {
                                key: "to",
                                label: "To",
                                render: (t: TrustLink) => (
                                    <span className="font-mono">{t.to.slice(0, 8)}</span>
                                ),
                            },
                            {
                                key: "created_at",
                                label: "Created",
                                className: "text-xs",
                                render: (t: TrustLink) => (
                                    <span>{formatAdminTime(t.created_at)}</span>
                                ),
                            },
                        ]}
                        data={trustLinks.filter((t) => t.status === "pending").slice(0, 5)}
                        keyExtractor={(t, idx) => `${t.from}-${t.to}-${idx}`}
                        emptyMessage="No pending trust requests"
                    />
                </Panel>

                <Panel title="Recent Sessions">
                    <DataTable
                        columns={[
                            {
                                key: "anon_id",
                                label: "Anon ID",
                                render: (s: AdminSession) => (
                                    <span className="font-mono">{s.anon_id.slice(0, 8)}</span>
                                ),
                            },
                            {
                                key: "token",
                                label: "Token",
                                render: (s: AdminSession) => (
                                    <span className="font-mono text-xs">{maskToken(s.token)}</span>
                                ),
                            },
                            {
                                key: "expires_at",
                                label: "Expires",
                                className: "text-xs",
                                render: (s: AdminSession) => (
                                    <span>{formatAdminTime(s.expires_at)}</span>
                                ),
                            },
                        ]}
                        data={sessions.slice(0, 5)}
                        keyExtractor={(s) => s.token}
                        emptyMessage="No active sessions"
                    />
                </Panel>
            </div>

            {/* Bottom Row: Recent Posts + Top Posters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panel title="Recent Feed Posts" className="lg:col-span-2">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {posts.slice(0, 8).map((post) => (
                            <div
                                key={post.id}
                                className="rounded-xl border border-emerald-500/10 dark:border-green-500/10 bg-white/50 dark:bg-black/30 p-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-900 dark:text-green-100 line-clamp-2 mb-1">
                                            {post.text}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-green-300/70">
                                            <span className="font-mono">{post.anon_id.slice(0, 8)}</span>
                                            <span>•</span>
                                            <span>{formatAdminTime(post.created_at)}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePost(post.id)}
                                        className="shrink-0 rounded-lg px-2 py-1 text-xs border border-red-400/40 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                        {posts.length === 0 && (
                            <p className="text-center py-8 text-slate-500 dark:text-green-300/50">
                                No posts yet
                            </p>
                        )}
                    </div>
                </Panel>

                <Panel title="Top Posters">
                    <div className="space-y-2">
                        {(stats?.top_posters || []).slice(0, 5).map((poster, idx) => (
                            <div
                                key={poster.anon_id}
                                className="flex items-center justify-between py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 dark:bg-green-500/10 flex items-center justify-center text-xs font-mono text-emerald-700 dark:text-green-400">
                                        {idx + 1}
                                    </span>
                                    <span className="font-mono text-sm text-slate-800 dark:text-green-200">
                                        {poster.anon_id.slice(0, 8)}
                                    </span>
                                </div>
                                <span className="font-mono text-sm text-emerald-700 dark:text-green-400">
                                    {poster.post_count}
                                </span>
                            </div>
                        ))}
                        {(!stats?.top_posters || stats.top_posters.length === 0) && (
                            <p className="text-center py-4 text-slate-500 dark:text-green-300/50">
                                No data
                            </p>
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );

    const renderSessions = () => (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Sessions</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Active user sessions overview • {sessions.length} active
                    {selectedSessions.size > 0 && ` • ${selectedSessions.size} selected`}
                </p>
            </div>

            {selectedSessions.size > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 dark:border-green-500/30 bg-emerald-500/5 dark:bg-green-500/10 p-4">
                    <div className="flex-1">
                        <p className="text-sm font-mono text-emerald-800 dark:text-green-300">
                            {selectedSessions.size} session{selectedSessions.size !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedSessions(new Set())}
                        className="rounded-lg px-3 py-1 text-xs border border-slate-300 dark:border-green-500/30 text-slate-600 dark:text-green-300 hover:bg-slate-50 dark:hover:bg-green-500/10 transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={handleBulkRevokeClick}
                        className="rounded-lg px-3 py-1 text-xs border border-red-400/40 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10 transition-colors font-mono font-semibold"
                    >
                        Revoke All
                    </button>
                </div>
            )}

            <Panel>
                <DataTable
                    columns={[
                        {
                            key: "anon_id",
                            label: "Anon ID",
                            render: (s: AdminSession) => (
                                <span className="font-mono">{s.anon_id.slice(0, 8)}</span>
                            ),
                        },
                        {
                            key: "token",
                            label: "Token",
                            render: (s: AdminSession) => (
                                <span className="font-mono text-xs">{maskToken(s.token)}</span>
                            ),
                        },
                        {
                            key: "created_at",
                            label: "Created",
                            className: "text-xs",
                            render: (s: AdminSession) => (
                                <span>{formatAdminTime(s.created_at)}</span>
                            ),
                        },
                        {
                            key: "expires_at",
                            label: "Expires",
                            className: "text-xs",
                            render: (s: AdminSession) => (
                                <span>{formatAdminTime(s.expires_at)}</span>
                            ),
                        },
                        {
                            key: "actions",
                            label: "Actions",
                            render: (s: AdminSession) => (
                                <button
                                    type="button"
                                    onClick={() => handleRevokeSessionClick(s.token, s.anon_id)}
                                    className="rounded-lg px-3 py-1 text-xs border border-red-400/40 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                                >
                                    Revoke
                                </button>
                            ),
                        },
                    ]}
                    data={sessions}
                    keyExtractor={(s) => s.token}
                    emptyMessage="No sessions recorded"
                    selectable={true}
                    selectedItems={selectedSessions}
                    onSelectItem={handleSelectSession}
                    onSelectAll={handleSelectAllSessions}
                />
            </Panel>
        </div>
    );

    const renderTrust = () => (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Trust Graph</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Trust relationships and requests
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Pending" value={trustSummary.pending} />
                <StatCard title="Accepted" value={trustSummary.accepted} />
                <StatCard title="Declined" value={trustSummary.declined} />
            </div>

            <Panel>
                <DataTable
                    columns={[
                        {
                            key: "from",
                            label: "From",
                            render: (t: TrustLink) => (
                                <span className="font-mono">{t.from.slice(0, 8)}</span>
                            ),
                        },
                        {
                            key: "to",
                            label: "To",
                            render: (t: TrustLink) => (
                                <span className="font-mono">{t.to.slice(0, 8)}</span>
                            ),
                        },
                        {
                            key: "status",
                            label: "Status",
                            render: (t: TrustLink) => (
                                <span
                                    className={`inline-flex px-2 py-1 rounded-lg text-xs font-mono ${
                                        t.status === "accepted"
                                            ? "bg-emerald-500/15 text-emerald-700 dark:bg-green-500/15 dark:text-green-300"
                                            : t.status === "pending"
                                              ? "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"
                                              : "bg-red-500/15 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                    }`}
                                >
                                    {t.status}
                                </span>
                            ),
                        },
                        {
                            key: "created_at",
                            label: "Created",
                            className: "text-xs",
                            render: (t: TrustLink) => (
                                <span>{formatAdminTime(t.created_at)}</span>
                            ),
                        },
                    ]}
                    data={trustLinks}
                    keyExtractor={(t, idx) => `${t.from}-${t.to}-${idx}`}
                    emptyMessage="No trust links recorded"
                />
            </Panel>
        </div>
    );

    const renderFeed = () => {
        const filteredPosts = posts.filter((post) => {
            if (!feedFilter.trim()) return true;
            const searchTerm = feedFilter.toLowerCase();
            return (
                post.text.toLowerCase().includes(searchTerm) ||
                post.anon_id.toLowerCase().includes(searchTerm) ||
                post.id.toLowerCase().includes(searchTerm)
            );
        });

        return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Feed Posts</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Moderation and post management
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-green-400/70" />
                    <input
                        type="text"
                        placeholder="Search by post content, Anon ID, or post ID..."
                        value={feedFilter}
                        onChange={(e) => setFeedFilter(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20
                            bg-white/50 dark:bg-black/30 backdrop-blur
                            text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-400/50
                            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-green-500/50
                            transition-all"
                    />
                    {feedFilter && (
                        <button
                            type="button"
                            onClick={() => setFeedFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
                                text-slate-400 dark:text-green-400/70 hover:text-slate-600 dark:hover:text-green-300
                                hover:bg-slate-100 dark:hover:bg-green-500/10 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {feedFilter && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-green-300/70">
                        Found {filteredPosts.length} of {posts.length} posts
                    </p>
                )}
            </div>

            <Panel>
                <DataTable
                    columns={[
                        {
                            key: "text",
                            label: "Post",
                            render: (p: AdminPost) => (
                                <div className="max-w-md">
                                    <p className="text-slate-900 dark:text-green-100 line-clamp-2">{p.text}</p>
                                </div>
                            ),
                        },
                        {
                            key: "anon_id",
                            label: "Anon ID",
                            render: (p: AdminPost) => (
                                <span className="font-mono">{p.anon_id.slice(0, 8)}</span>
                            ),
                        },
                        {
                            key: "created_at",
                            label: "Created",
                            className: "text-xs",
                            render: (p: AdminPost) => (
                                <span>{formatAdminTime(p.created_at)}</span>
                            ),
                        },
                        {
                            key: "actions",
                            label: "Actions",
                            render: (p: AdminPost) => (
                                <button
                                    type="button"
                                    onClick={() => handleDeletePost(p.id)}
                                    className="rounded-lg px-3 py-1 text-xs border border-red-400/40 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                                >
                                    Delete
                                </button>
                            ),
                        },
                    ]}
                    data={filteredPosts}
                    keyExtractor={(p) => p.id}
                    emptyMessage={feedFilter ? "No posts match your search" : "No posts found"}
                />
            </Panel>
        </div>
        );
    };

    const renderAbuse = () => {
        const filteredAbuse = abuse.filter((report) => {
            if (!abuseFilter.trim()) return true;
            const searchTerm = abuseFilter.toLowerCase();
            return (
                report.anon_id.toLowerCase().includes(searchTerm) ||
                report.rate_status.toLowerCase().includes(searchTerm) ||
                report.post_count.toString().includes(searchTerm)
            );
        });

        return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Abuse Monitor</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Rate limiting and abuse detection
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-green-400/70" />
                    <input
                        type="text"
                        placeholder="Search by Anon ID, rate status, or post count..."
                        value={abuseFilter}
                        onChange={(e) => setAbuseFilter(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20
                            bg-white/50 dark:bg-black/30 backdrop-blur
                            text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-400/50
                            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-green-500/50
                            transition-all"
                    />
                    {abuseFilter && (
                        <button
                            type="button"
                            onClick={() => setAbuseFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
                                text-slate-400 dark:text-green-400/70 hover:text-slate-600 dark:hover:text-green-300
                                hover:bg-slate-100 dark:hover:bg-green-500/10 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {abuseFilter && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-green-300/70">
                        Found {filteredAbuse.length} of {abuse.length} reports
                    </p>
                )}
            </div>

            <Panel description="Highlights accounts with abnormal posting volume. No IP data is collected.">
                <DataTable
                    columns={[
                        {
                            key: "anon_id",
                            label: "Anon ID",
                            render: (r: AbuseReport) => (
                                <span className="font-mono">{r.anon_id.slice(0, 8)}</span>
                            ),
                        },
                        {
                            key: "post_count",
                            label: "Posts",
                            render: (r: AbuseReport) => (
                                <span className="font-mono">{r.post_count}</span>
                            ),
                        },
                        {
                            key: "last_post_at",
                            label: "Last Post",
                            render: (r: AbuseReport) => r.last_post_at ? formatAdminTime(r.last_post_at) : "-",
                        },
                        {
                            key: "rate_status",
                            label: "Rate Status",
                            render: (r: AbuseReport) => (
                                <span className="font-mono">{r.rate_status}</span>
                            ),
                        },
                    ]}
                    data={filteredAbuse}
                    keyExtractor={(r) => r.anon_id}
                    emptyMessage={abuseFilter ? "No reports match your search" : "No abuse signals detected"}
                />
            </Panel>
        </div>
        );
    };

    const renderAudit = () => (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Audit Log</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Admin actions and compliance tracking
                </p>
            </div>

            <Panel description="Tracks admin moderation actions for accountability">
                <DataTable
                    columns={[
                        {
                            key: "action",
                            label: "Action",
                            render: (log: AuditLog) => (
                                <span className="font-mono">{log.action}</span>
                            ),
                        },
                        {
                            key: "anon_id",
                            label: "Actor",
                            render: (log: AuditLog) => (
                                <span className="font-mono">{log.anon_id}</span>
                            ),
                        },
                        {
                            key: "details",
                            label: "Details",
                            className: "text-xs max-w-xs truncate",
                        },
                        {
                            key: "timestamp",
                            label: "Time",
                            className: "text-xs",
                            render: (log: AuditLog) => (
                                <span>{formatAdminTime(log.timestamp)}</span>
                            ),
                        },
                    ]}
                    data={auditLogs}
                    keyExtractor={(log) => log.id}
                    emptyMessage="No audit events recorded"
                />
            </Panel>
        </div>
    );

    const renderUsers = () => {
        const filteredUsers = users.filter((user) => {
            if (!usersFilter.trim()) return true;
            const searchTerm = usersFilter.toLowerCase();
            return (
                user.anon_id.toLowerCase().includes(searchTerm) ||
                user.post_count.toString().includes(searchTerm)
            );
        });

        return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Users</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    User accounts overview
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-green-400/70" />
                    <input
                        type="text"
                        placeholder="Search by Anon ID or post count..."
                        value={usersFilter}
                        onChange={(e) => setUsersFilter(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20
                            bg-white/50 dark:bg-black/30 backdrop-blur
                            text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-400/50
                            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-green-500/50
                            transition-all"
                    />
                    {usersFilter && (
                        <button
                            type="button"
                            onClick={() => setUsersFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
                                text-slate-400 dark:text-green-400/70 hover:text-slate-600 dark:hover:text-green-300
                                hover:bg-slate-100 dark:hover:bg-green-500/10 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {usersFilter && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-green-300/70">
                        Found {filteredUsers.length} of {users.length} users
                    </p>
                )}
            </div>

            <Panel>
                <DataTable
                    columns={[
                        {
                            key: "anon_id",
                            label: "Anon ID",
                            render: (u: AdminUser) => (
                                <span className="font-mono">{u.anon_id.slice(0, 8)}</span>
                            ),
                        },
                        {
                            key: "post_count",
                            label: "Posts",
                            render: (u: AdminUser) => (
                                <span className="font-mono">{u.post_count}</span>
                            ),
                        },
                        {
                            key: "created_at",
                            label: "First Seen",
                            className: "text-xs",
                            render: (u: AdminUser) => (
                                <span>{formatAdminTime(u.created_at)}</span>
                            ),
                        },
                    ]}
                    data={filteredUsers}
                    keyExtractor={(u) => u.anon_id}
                    emptyMessage={usersFilter ? "No users match your search" : "No users found"}
                />
            </Panel>
        </div>
        );
    };

    const renderPlaceholder = (title: string) => (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">{title}</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Coming soon
                </p>
            </div>
            <Panel>
                <div className="py-12 text-center text-slate-500 dark:text-green-300/50">
                    This section is under development
                </div>
            </Panel>
        </div>
    );

    const renderContent = () => {
        if (!hasSession) {
            return null;
        }

        if (isLoading && !stats) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 dark:border-green-500/20 border-t-emerald-500 dark:border-t-green-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-green-300/70">Loading admin data...</p>
                    </div>
                </div>
            );
        }

        switch (currentPage) {
            case "dashboard":
                return renderDashboard();
            case "sessions":
                return renderSessions();
            case "users":
                return renderUsers();
            case "trust":
                return renderTrust();
            case "feed":
                return renderFeed();
            case "abuse":
                return renderAbuse();
            case "audit":
                return renderAudit();
            case "link-cards":
                return renderPlaceholder("Link Cards");
            case "map":
                return renderPlaceholder("Map Pings");
            default:
                return renderDashboard();
        }
    };

    return (
        <AdminLayout 
            currentPage={currentPage} 
            onNavigate={handleNavigate}
            onLogout={handleClearKey}
        >
            {renderContent()}

            {/* Revoke Session Confirmation Modal */}
            <ConfirmationModal
                open={revokeModalOpen}
                onClose={() => {
                    setRevokeModalOpen(false);
                    setSessionToRevoke(null);
                }}
                onConfirm={sessionToRevoke ? handleConfirmRevoke : handleConfirmBulkRevoke}
                title={sessionToRevoke ? "Revoke Session" : "Revoke Selected Sessions"}
                message={
                    sessionToRevoke
                        ? `Are you sure you want to revoke the session for user ${sessionToRevoke.anonId.slice(0, 8)}? This will force the user to logout immediately.`
                        : `Are you sure you want to revoke ${selectedSessions.size} session${selectedSessions.size !== 1 ? 's' : ''}? All selected users will be forced to logout immediately.`
                }
                confirmText={sessionToRevoke ? "Revoke Session" : `Revoke ${selectedSessions.size} Session${selectedSessions.size !== 1 ? 's' : ''}`}
                cancelText="Cancel"
                danger={true}
            />
        </AdminLayout>
    );
}
