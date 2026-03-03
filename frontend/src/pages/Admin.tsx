import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ClockIcon,
    ShieldCheckIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import AdminLayout from "../components/admin/AdminLayout";
import StatCard from "../components/admin/StatCard";
import Panel from "../components/admin/Panel";
import DataTable from "../components/admin/DataTable";
import SystemHealthPanel from "../components/admin/SystemHealthPanel";
import ConfirmationModal from "../components/ConfirmationModal";
import CopyButton from "../components/CopyButton";
import PostDetailModal from "../components/PostDetailModal";
import { formatAdminTime } from "../utils/formatTime";
import {
    banAdminUser,
    clearAdminToken,
    deleteAdminPost,
    deleteAuditLogs,
    clearAuditLogs,
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

const BAN_DURATION_OPTIONS = [
    { value: "1day", label: "1 day" },
    { value: "3days", label: "3 days" },
    { value: "10days", label: "10 days" },
    { value: "3months", label: "3 months" },
    { value: "1year", label: "1 year" },
    { value: "permanent", label: "Permanently" },
] as const;

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
    const [sessionsFilter, setSessionsFilter] = useState("");
    const [sessionsExpiryFilter, setSessionsExpiryFilter] = useState<"all" | "active" | "expiring" | "expired">("all");
    const [sessionsSort, setSessionsSort] = useState<"expires-soon" | "newest" | "oldest">("expires-soon");
    const [feedFilter, setFeedFilter] = useState("");
    const [feedDateFilter, setFeedDateFilter] = useState<"all" | "24h" | "7d" | "30d">("all");
    const [feedSort, setFeedSort] = useState<"newest" | "oldest" | "longest">("newest");
    const [usersFilter, setUsersFilter] = useState("");
    const [usersBanFilter, setUsersBanFilter] = useState<"all" | "active" | "banned">("all");
    const [usersActivityFilter, setUsersActivityFilter] = useState<"all" | "reported" | "high-posters" | "new">("all");
    const [usersSort, setUsersSort] = useState<"most-posts" | "most-reported" | "newest" | "oldest">("most-posts");
    const [abuseFilter, setAbuseFilter] = useState("");
    const [abuseReportedFilter, setAbuseReportedFilter] = useState<"all" | "reported" | "not-reported">("all");
    const [auditFilter, setAuditFilter] = useState("");

    // Revoke session modal state
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [sessionToRevoke, setSessionToRevoke] = useState<{ token: string; anonId: string } | null>(null);

    // Session selection state
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

    // Audit log selection state
    const [selectedAuditLogs, setSelectedAuditLogs] = useState<Set<string>>(new Set());
    const [deleteAuditModalOpen, setDeleteAuditModalOpen] = useState(false);
    const [clearAuditModalOpen, setClearAuditModalOpen] = useState(false);

    // Post detail modal state
    const [postDetailModalOpen, setPostDetailModalOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedPostReportCount, setSelectedPostReportCount] = useState(0);
    const [allowDeleteFromPostModal, setAllowDeleteFromPostModal] = useState(false);

    // Ban user modal state
    const [banModalOpen, setBanModalOpen] = useState(false);
    const [selectedUserForBan, setSelectedUserForBan] = useState<AdminUser | null>(null);
    const [selectedBanDuration, setSelectedBanDuration] = useState<string>("1day");
    const [isSubmittingBan, setIsSubmittingBan] = useState(false);

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

    const handleDeletePost = async (postId: string, confirmFirst: boolean = true) => {
        if (confirmFirst && !confirm("Delete this post? This action is logged.")) return;
        try {
            await deleteAdminPost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            const [statsRes, auditRes, abuseRes] = await Promise.all([fetchAdminStats(), fetchAdminAudit(), fetchAdminAbuse()]);
            setStats(statsRes);
            setAuditLogs(auditRes.logs);
            setAbuse(abuseRes.abuse_reports);

            if (selectedPostId === postId) {
                setPostDetailModalOpen(false);
                setSelectedPostId(null);
                setSelectedPostReportCount(0);
                setAllowDeleteFromPostModal(false);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to delete post";
            setError(msg);
        }
    };

    const openBanModal = (user: AdminUser) => {
        if (user.is_banned) {
            return;
        }
        setSelectedUserForBan(user);
        setSelectedBanDuration("1day");
        setBanModalOpen(true);
    };

    const closeBanModal = () => {
        if (isSubmittingBan) return;
        setBanModalOpen(false);
        setSelectedUserForBan(null);
        setSelectedBanDuration("1day");
    };

    const handleConfirmBanUser = async () => {
        if (!selectedUserForBan) return;

        try {
            setIsSubmittingBan(true);
            await banAdminUser(selectedUserForBan.anon_id, selectedBanDuration);

            const [usersRes, sessionsRes, auditRes] = await Promise.all([
                fetchAdminUsers(),
                fetchAdminSessions(),
                fetchAdminAudit(),
            ]);

            setUsers(usersRes.users);
            setSessions(sessionsRes.sessions);
            setAuditLogs(auditRes.logs);
            closeBanModal();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to ban user";
            setError(msg);
        } finally {
            setIsSubmittingBan(false);
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

    const handleSelectAllSessions = (isSelected: boolean, visibleSessions: AdminSession[]) => {
        if (isSelected) {
            const visibleTokens = visibleSessions.map((s) => s.token);
            setSelectedSessions((prev) => {
                const next = new Set(prev);
                visibleTokens.forEach((token) => next.add(token));
                return next;
            });
        } else {
            const visibleTokens = new Set(visibleSessions.map((s) => s.token));
            setSelectedSessions((prev) => {
                const next = new Set(prev);
                visibleTokens.forEach((token) => next.delete(token));
                return next;
            });
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

    // Audit log handlers
    const handleSelectAuditLog = (id: string) => {
        if (!id || !id.trim()) return;
        setSelectedAuditLogs((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAllAuditLogs = (isSelected: boolean, filteredLogs: AuditLog[]) => {
        const selectableIDs = filteredLogs
            .map((log) => (log.id || "").trim())
            .filter((id) => id.length > 0);

        if (isSelected) {
            // Add all filtered log IDs to selection
            setSelectedAuditLogs((prev) => {
                const next = new Set(prev);
                selectableIDs.forEach((id) => next.add(id));
                return next;
            });
        } else {
            // Remove all filtered log IDs from selection
            setSelectedAuditLogs((prev) => {
                const next = new Set(prev);
                selectableIDs.forEach((id) => next.delete(id));
                return next;
            });
        }
    };

    const handleDeleteAuditLogsClick = () => {
        if (selectedAuditLogs.size === 0) return;
        setDeleteAuditModalOpen(true);
    };

    const handleConfirmDeleteAuditLogs = async () => {
        if (selectedAuditLogs.size === 0) return;

        try {
            await deleteAuditLogs(Array.from(selectedAuditLogs));
            setAuditLogs((prev) => prev.filter((log) => !selectedAuditLogs.has(log.id)));
            setSelectedAuditLogs(new Set());
            setDeleteAuditModalOpen(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to delete audit logs";
            setError(msg);
        }
    };

    const handleClearAuditLogsClick = () => {
        setClearAuditModalOpen(true);
    };

    const handleConfirmClearAuditLogs = async () => {
        try {
            await clearAuditLogs();
            setAuditLogs([]);
            setSelectedAuditLogs(new Set());
            setClearAuditModalOpen(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to clear audit logs";
            setError(msg);
        }
    };

    const matchesAuditFilter = (log: AuditLog, rawFilter: string) => {
        const searchTerm = rawFilter.trim().toLowerCase();
        if (!searchTerm) return true;

        const action = (log.action || "").toLowerCase();
        const actor = (log.anon_id || "").toLowerCase();
        const details = (log.details || "").toLowerCase();

        return (
            action.includes(searchTerm) ||
            actor.includes(searchTerm) ||
            details.includes(searchTerm)
        );
    };

    const handleExportAuditLogs = (format: 'csv' | 'json') => {
        const logsToExport = auditFilter ? auditLogs.filter((log) => matchesAuditFilter(log, auditFilter)) : auditLogs;

        if (logsToExport.length === 0) {
            setError("No logs to export");
            return;
        }

        let content: string;
        let filename: string;
        let mimeType: string;

        if (format === 'csv') {
            // CSV format
            const headers = ['ID', 'Action', 'Actor', 'Details', 'Timestamp'];
            const rows = logsToExport.map(log => [
                log.id || '',
                log.action || '',
                log.anon_id || '',
                (log.details || '').replace(/"/g, '""'), // Escape quotes and handle null/undefined
                log.timestamp || ''
            ]);
            content = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
        } else {
            // JSON format
            content = JSON.stringify(logsToExport, null, 2);
            filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        }

        // Create and trigger download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const maskToken = (token: string) => {
        if (token.length <= 8) return token;
        return `${token.slice(0, 4)}...${token.slice(-4)}`;
    };

    const renderAuditDetails = (details: string) => {
        const copyableDetailKeys = new Set([
            "anon_id",
            "post_id",
            "comment_id",
            "reply_id",
            "token",
            "session_token",
            "device_public_id",
            "code",
        ]);

        const raw = (details || "").trim();
        if (!raw) {
            return <span className="text-slate-400 dark:text-green-300/50">—</span>;
        }

        const segments = raw.split(",").map((part) => part.trim()).filter(Boolean);
        const keyValueSegments = segments
            .map((segment) => {
                const equalAt = segment.indexOf("=");
                if (equalAt <= 0 || equalAt >= segment.length - 1) {
                    return null;
                }

                const key = segment.slice(0, equalAt).trim();
                const value = segment.slice(equalAt + 1).trim();
                if (!key || !value) {
                    return null;
                }

                return { key, value };
            })
            .filter((pair): pair is { key: string; value: string } => Boolean(pair));

        if (segments.length > 0 && keyValueSegments.length === segments.length) {
            return (
                <div className="space-y-1">
                    {keyValueSegments.map((pair, index) => (
                        <div key={`${pair.key}-${pair.value}-${index}`} className="flex items-start justify-between gap-2">
                            <div className="text-xs leading-5 min-w-0">
                                <span className="text-slate-600 dark:text-green-300/70">{pair.key.replace(/_/g, " ")}: </span>
                                <span className="font-mono text-slate-800 dark:text-green-200 break-all">{pair.value}</span>
                            </div>
                            {copyableDetailKeys.has(pair.key.toLowerCase()) ? (
                                <CopyButton value={pair.value} size="sm" />
                            ) : null}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <p className="text-xs leading-5 text-slate-700 dark:text-green-200 whitespace-pre-wrap break-words">
                {raw}
            </p>
        );
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
                {/* Dual metric card for Total Users | Active Users */}
                <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-5">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-mono tracking-wider uppercase text-slate-600 dark:text-green-300/70 mb-2">
                                Total Users | Active Users
                            </p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-semibold text-slate-950 dark:text-green-100">
                                    {stats?.total_users ?? 0}
                                </p>
                                <span className="text-xl text-slate-400 dark:text-green-500/50 font-light">|</span>
                                <p className="text-3xl font-semibold text-emerald-600 dark:text-green-400">
                                    {stats?.active_users ?? 0}
                                </p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-green-500/10 flex items-center justify-center border border-emerald-500/20 dark:border-green-500/20">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-emerald-700 dark:text-green-400" />
                        </div>
                    </div>
                </div>
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

    const renderSessions = () => {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const hasSessionFilterChanges =
            sessionsFilter.trim().length > 0 ||
            sessionsExpiryFilter !== "all" ||
            sessionsSort !== "expires-soon";
        const activeSessionFilterCount =
            (sessionsFilter.trim().length > 0 ? 1 : 0) +
            (sessionsExpiryFilter !== "all" ? 1 : 0) +
            (sessionsSort !== "expires-soon" ? 1 : 0);

        const filteredSessions = sessions
            .filter((session) => {
                const searchTerm = sessionsFilter.trim().toLowerCase();
                if (searchTerm) {
                    const matchesSearch =
                        session.anon_id.toLowerCase().includes(searchTerm) ||
                        session.token.toLowerCase().includes(searchTerm);
                    if (!matchesSearch) return false;
                }

                const expiresAtMs = Date.parse(session.expires_at);
                if (Number.isNaN(expiresAtMs)) {
                    return sessionsExpiryFilter === "all";
                }

                if (sessionsExpiryFilter === "active" && expiresAtMs <= now) return false;
                if (sessionsExpiryFilter === "expiring" && (expiresAtMs <= now || expiresAtMs > now + oneDayMs)) return false;
                if (sessionsExpiryFilter === "expired" && expiresAtMs > now) return false;

                return true;
            })
            .sort((a, b) => {
                const createdA = Date.parse(a.created_at);
                const createdB = Date.parse(b.created_at);
                const expiresA = Date.parse(a.expires_at);
                const expiresB = Date.parse(b.expires_at);

                if (sessionsSort === "newest") {
                    return (Number.isNaN(createdB) ? 0 : createdB) - (Number.isNaN(createdA) ? 0 : createdA);
                }

                if (sessionsSort === "oldest") {
                    return (Number.isNaN(createdA) ? 0 : createdA) - (Number.isNaN(createdB) ? 0 : createdB);
                }

                return (Number.isNaN(expiresA) ? Number.MAX_SAFE_INTEGER : expiresA) - (Number.isNaN(expiresB) ? Number.MAX_SAFE_INTEGER : expiresB);
            });

        return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Sessions</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Active user sessions overview • {filteredSessions.length} shown of {sessions.length}
                    {selectedSessions.size > 0 && ` • ${selectedSessions.size} selected`}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_190px_190px_auto] gap-3">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-green-400/70" />
                    <input
                        type="text"
                        placeholder="Search by Anon ID or session token..."
                        value={sessionsFilter}
                        onChange={(e) => setSessionsFilter(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20
                            bg-white/50 dark:bg-black/30 backdrop-blur
                            text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-400/50
                            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-green-500/50
                            transition-all"
                    />
                    {sessionsFilter && (
                        <button
                            type="button"
                            onClick={() => setSessionsFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
                                text-slate-400 dark:text-green-400/70 hover:text-slate-600 dark:hover:text-green-300
                                hover:bg-slate-100 dark:hover:bg-green-500/10 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <select
                    value={sessionsExpiryFilter}
                    onChange={(e) => setSessionsExpiryFilter(e.target.value as "all" | "active" | "expiring" | "expired")}
                    className="px-3 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-green-100"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expiring">Expiring 24h</option>
                    <option value="expired">Expired</option>
                </select>

                <select
                    value={sessionsSort}
                    onChange={(e) => setSessionsSort(e.target.value as "expires-soon" | "newest" | "oldest")}
                    className="px-3 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-green-100"
                >
                    <option value="expires-soon">Sort: Expiry Soon</option>
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                </select>

                {hasSessionFilterChanges && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono border border-emerald-500/25 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-emerald-700 dark:text-green-300">
                            {activeSessionFilterCount} active
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setSessionsFilter("");
                                setSessionsExpiryFilter("all");
                                setSessionsSort("expires-soon");
                            }}
                            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-green-500/30 text-sm text-slate-700 dark:text-green-300 hover:bg-slate-50 dark:hover:bg-green-500/10 transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
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
                    data={filteredSessions}
                    keyExtractor={(s) => s.token}
                    emptyMessage={sessionsFilter || sessionsExpiryFilter !== "all" ? "No sessions match current filters" : "No sessions recorded"}
                    selectable={true}
                    selectedItems={selectedSessions}
                    onSelectItem={handleSelectSession}
                    onSelectAll={(isSelected) => handleSelectAllSessions(isSelected, filteredSessions)}
                />
            </Panel>
        </div>
        );
    };

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
        const now = Date.now();
        const thresholdByWindow: Record<"24h" | "7d" | "30d", number> = {
            "24h": now - 24 * 60 * 60 * 1000,
            "7d": now - 7 * 24 * 60 * 60 * 1000,
            "30d": now - 30 * 24 * 60 * 60 * 1000,
        };
        const hasFeedFilterChanges =
            feedFilter.trim().length > 0 ||
            feedDateFilter !== "all" ||
            feedSort !== "newest";
        const activeFeedFilterCount =
            (feedFilter.trim().length > 0 ? 1 : 0) +
            (feedDateFilter !== "all" ? 1 : 0) +
            (feedSort !== "newest" ? 1 : 0);

        const filteredPosts = posts
            .filter((post) => {
                const searchTerm = feedFilter.trim().toLowerCase();
                if (searchTerm) {
                    const matchesSearch =
                        post.text.toLowerCase().includes(searchTerm) ||
                        post.anon_id.toLowerCase().includes(searchTerm) ||
                        post.id.toLowerCase().includes(searchTerm);
                    if (!matchesSearch) return false;
                }

                if (feedDateFilter !== "all") {
                    const createdAtMs = Date.parse(post.created_at);
                    if (Number.isNaN(createdAtMs) || createdAtMs < thresholdByWindow[feedDateFilter]) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                const createdA = Date.parse(a.created_at);
                const createdB = Date.parse(b.created_at);

                if (feedSort === "oldest") {
                    return (Number.isNaN(createdA) ? 0 : createdA) - (Number.isNaN(createdB) ? 0 : createdB);
                }

                if (feedSort === "longest") {
                    return b.text.length - a.text.length;
                }

                return (Number.isNaN(createdB) ? 0 : createdB) - (Number.isNaN(createdA) ? 0 : createdA);
            });

        return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Feed Posts</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Moderation and post management
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_190px_auto] gap-3">
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
                <select
                    value={feedDateFilter}
                    onChange={(e) => setFeedDateFilter(e.target.value as "all" | "24h" | "7d" | "30d")}
                    className="px-3 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-green-100"
                >
                    <option value="all">All Time</option>
                    <option value="24h">Last 24h</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                </select>
                <select
                    value={feedSort}
                    onChange={(e) => setFeedSort(e.target.value as "newest" | "oldest" | "longest")}
                    className="px-3 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-green-100"
                >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="longest">Sort: Longest Text</option>
                </select>

                {hasFeedFilterChanges && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono border border-emerald-500/25 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-emerald-700 dark:text-green-300">
                            {activeFeedFilterCount} active
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setFeedFilter("");
                                setFeedDateFilter("all");
                                setFeedSort("newest");
                            }}
                            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-green-500/30 text-sm text-slate-700 dark:text-green-300 hover:bg-slate-50 dark:hover:bg-green-500/10 transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>
            {(feedFilter || feedDateFilter !== "all") && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-green-300/70">
                        Found {filteredPosts.length} of {posts.length} posts
                    </p>
                )}

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
                    emptyMessage={feedFilter || feedDateFilter !== "all" ? "No posts match current filters" : "No posts found"}
                />
            </Panel>
        </div>
        );
    };

    const renderAbuse = () => {
        const filteredAbuse = abuse.filter((report) => {
            const hasReportedPost = Boolean(report.reported_post);

            if (abuseReportedFilter === "reported" && !hasReportedPost) return false;
            if (abuseReportedFilter === "not-reported" && hasReportedPost) return false;

            if (!abuseFilter.trim()) return true;
            const searchTerm = abuseFilter.toLowerCase();

            const reportedPostID = (report.reported_post?.post_id || "").toLowerCase();
            const reportedReason = (report.reported_post?.reason || "").toLowerCase();
            const reportedCount = (report.reported_post?.report_count ?? "").toString();

            return (
                report.anon_id.toLowerCase().includes(searchTerm) ||
                report.rate_status.toLowerCase().includes(searchTerm) ||
                report.post_count.toString().includes(searchTerm) ||
                reportedPostID.includes(searchTerm) ||
                reportedReason.includes(searchTerm) ||
                reportedCount.includes(searchTerm)
            );
        });

        const abuseRows = abuseReportedFilter === "reported"
            ? [...filteredAbuse].sort((a, b) => {
                const aReports = a.reported_post?.report_count ?? 0;
                const bReports = b.reported_post?.report_count ?? 0;
                if (bReports !== aReports) return bReports - aReports;

                const aLast = Date.parse(a.reported_post?.last_reported_at || a.last_post_at || "");
                const bLast = Date.parse(b.reported_post?.last_reported_at || b.last_post_at || "");
                return (Number.isNaN(bLast) ? 0 : bLast) - (Number.isNaN(aLast) ? 0 : aLast);
            })
            : filteredAbuse;

        return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Abuse Monitor</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    Rate limiting and abuse detection
                </p>
            </div>

            {/* Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-green-400/70" />
                    <input
                        type="text"
                        placeholder="Search Anon ID, status, post ID, reason, or report count..."
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
                <select
                    value={abuseReportedFilter}
                    onChange={(e) => setAbuseReportedFilter(e.target.value as "all" | "reported" | "not-reported")}
                    className="w-full py-3 px-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20
                        bg-white/50 dark:bg-black/30 backdrop-blur
                        text-slate-900 dark:text-green-100
                        focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-green-500/50"
                >
                    <option value="all">All rows</option>
                    <option value="reported">Reported posts only</option>
                    <option value="not-reported">No reported post</option>
                </select>
            </div>
            {(abuseFilter || abuseReportedFilter !== "all") && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-green-300/70">
                        Found {filteredAbuse.length} of {abuse.length} reports
                    </p>
            )}

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
                        {
                            key: "reported_post",
                            label: "Reported Post",
                            render: (r: AbuseReport) => {
                                if (!r.reported_post) {
                                    return <span className="text-slate-400 dark:text-green-300/50">—</span>;
                                }
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPostId(r.reported_post!.post_id);
                                            setSelectedPostReportCount(r.reported_post!.report_count);
                                            setAllowDeleteFromPostModal(false);
                                            setPostDetailModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/15 dark:bg-orange-500/10 border border-orange-500/30 dark:border-orange-500/20 text-orange-700 dark:text-orange-300 hover:bg-orange-500/25 dark:hover:bg-orange-500/15 transition font-mono text-xs cursor-pointer"
                                    >
                                        <span>🚩</span>
                                        <span>{r.reported_post.report_count}</span>
                                    </button>
                                );
                            },
                        },
                        {
                            key: "report_reason",
                            label: "Reason",
                            render: (r: AbuseReport) => {
                                const reason = r.reported_post?.reason?.trim();
                                if (!reason) {
                                    return <span className="text-slate-400 dark:text-green-300/50">—</span>;
                                }
                                return (
                                    <span className="text-xs text-slate-700 dark:text-green-200/80">
                                        {reason}
                                    </span>
                                );
                            },
                        },
                        {
                            key: "actions",
                            label: "Actions",
                            render: (r: AbuseReport) => {
                                const postId = r.reported_post?.post_id;
                                if (!postId) {
                                    return <span className="text-slate-400 dark:text-green-300/50">—</span>;
                                }
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPostId(postId);
                                            setSelectedPostReportCount(r.reported_post?.report_count || 0);
                                            setAllowDeleteFromPostModal(true);
                                            setPostDetailModalOpen(true);
                                        }}
                                        className="rounded-lg px-3 py-1 text-xs border border-red-400/40 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                                    >
                                        Delete
                                    </button>
                                );
                            },
                        },
                    ]}
                    data={abuseRows}
                    keyExtractor={(r) => r.anon_id}
                    emptyMessage={abuseFilter ? "No reports match your search" : "No abuse signals detected"}
                />
            </Panel>
        </div>
        );
    };

    const renderAudit = () => {
        const filteredAuditLogs = auditLogs.filter((log) => matchesAuditFilter(log, auditFilter));
        const selectableAuditLogs = filteredAuditLogs.filter((log) => Boolean(log.id && log.id.trim()));

        return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Audit Log</h1>
                    <p className="text-sm text-slate-700 dark:text-green-300/70">
                        Admin actions and compliance tracking
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleExportAuditLogs('csv')}
                        disabled={auditLogs.length === 0}
                        className="rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 dark:border-green-500/30
                            bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-300 
                            hover:bg-emerald-500/20 dark:hover:bg-green-500/20
                            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                            flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExportAuditLogs('json')}
                        disabled={auditLogs.length === 0}
                        className="rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 dark:border-green-500/30
                            bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-300 
                            hover:bg-emerald-500/20 dark:hover:bg-green-500/20
                            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                            flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export JSON
                    </button>
                    {selectedAuditLogs.size > 0 && (
                        <button
                            type="button"
                            onClick={handleDeleteAuditLogsClick}
                            className="rounded-xl px-4 py-2 text-sm font-mono border border-red-500/30
                                bg-red-500/10 text-red-800 dark:text-red-300 
                                hover:bg-red-500/20 transition-colors"
                        >
                            Delete Selected ({selectedAuditLogs.size})
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleClearAuditLogsClick}
                        disabled={auditLogs.length === 0}
                        className="rounded-xl px-4 py-2 text-sm font-mono border border-red-500/30
                            bg-red-500/10 text-red-800 dark:text-red-300 
                            hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-green-400/70" />
                    <input
                        type="text"
                        placeholder="Search by action, actor, or details..."
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20
                            bg-white/50 dark:bg-black/30 backdrop-blur
                            text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-400/50
                            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-green-500/50
                            transition-all"
                    />
                    {auditFilter && (
                        <button
                            type="button"
                            onClick={() => setAuditFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
                                text-slate-400 dark:text-green-400/70 hover:text-slate-600 dark:hover:text-green-300
                                hover:bg-slate-100 dark:hover:bg-green-500/10 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {auditFilter && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-green-300/70">
                        Found {filteredAuditLogs.length} of {auditLogs.length} logs
                    </p>
                )}
            </div>

            <Panel description="Tracks admin moderation actions for accountability">
                <DataTable
                    selectable
                    selectedItems={selectedAuditLogs}
                    onSelectItem={handleSelectAuditLog}
                    onSelectAll={(isSelected) => handleSelectAllAuditLogs(isSelected, selectableAuditLogs)}
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
                            className: "max-w-lg",
                            render: (log: AuditLog) => renderAuditDetails(log.details),
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
                    data={filteredAuditLogs}
                    keyExtractor={(log, idx) => (log.id && log.id.trim()) ? log.id : `audit-row-${idx}`}
                    emptyMessage={auditFilter ? "No logs match your search" : "No audit events recorded"}
                />
            </Panel>
        </div>
        );
    };

    const renderUsers = () => {
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const hasUsersFilterChanges =
            usersFilter.trim().length > 0 ||
            usersBanFilter !== "all" ||
            usersActivityFilter !== "all" ||
            usersSort !== "most-posts";
        const activeUsersFilterCount =
            (usersFilter.trim().length > 0 ? 1 : 0) +
            (usersBanFilter !== "all" ? 1 : 0) +
            (usersActivityFilter !== "all" ? 1 : 0) +
            (usersSort !== "most-posts" ? 1 : 0);

        const filteredUsers = users
            .filter((user) => {
                const searchTerm = usersFilter.trim().toLowerCase();
                if (searchTerm) {
                    const matchesSearch =
                        user.anon_id.toLowerCase().includes(searchTerm) ||
                        user.username.toLowerCase().includes(searchTerm) ||
                        user.post_count.toString().includes(searchTerm) ||
                        user.reported_posts.toString().includes(searchTerm);
                    if (!matchesSearch) return false;
                }

                if (usersBanFilter === "active" && user.is_banned) return false;
                if (usersBanFilter === "banned" && !user.is_banned) return false;

                if (usersActivityFilter === "reported" && user.reported_posts === 0) return false;
                if (usersActivityFilter === "high-posters" && user.post_count < 10) return false;
                if (usersActivityFilter === "new") {
                    const createdAtMs = Date.parse(user.created_at);
                    if (Number.isNaN(createdAtMs) || createdAtMs < sevenDaysAgo) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (usersSort === "most-reported") {
                    return b.reported_posts - a.reported_posts;
                }

                if (usersSort === "newest") {
                    const createdA = Date.parse(a.created_at);
                    const createdB = Date.parse(b.created_at);
                    return (Number.isNaN(createdB) ? 0 : createdB) - (Number.isNaN(createdA) ? 0 : createdA);
                }

                if (usersSort === "oldest") {
                    const createdA = Date.parse(a.created_at);
                    const createdB = Date.parse(b.created_at);
                    return (Number.isNaN(createdA) ? 0 : createdA) - (Number.isNaN(createdB) ? 0 : createdB);
                }

                return b.post_count - a.post_count;
            });

        return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">Users</h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    User accounts overview
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_200px_190px_auto] gap-3">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-green-400/70" />
                    <input
                        type="text"
                        placeholder="Search by Anon ID, username, or post count..."
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
                <select
                    value={usersBanFilter}
                    onChange={(e) => setUsersBanFilter(e.target.value as "all" | "active" | "banned")}
                    className="px-3 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-green-100"
                >
                    <option value="all">All Ban States</option>
                    <option value="active">Not Banned</option>
                    <option value="banned">Banned</option>
                </select>
                <select
                    value={usersActivityFilter}
                    onChange={(e) => setUsersActivityFilter(e.target.value as "all" | "reported" | "high-posters" | "new")}
                    className="px-3 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-green-100"
                >
                    <option value="all">All Activity</option>
                    <option value="reported">With Reports</option>
                    <option value="high-posters">High Posters (10+)</option>
                    <option value="new">New (7 days)</option>
                </select>
                <select
                    value={usersSort}
                    onChange={(e) => setUsersSort(e.target.value as "most-posts" | "most-reported" | "newest" | "oldest")}
                    className="px-3 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/50 dark:bg-black/30 text-slate-900 dark:text-green-100"
                >
                    <option value="most-posts">Sort: Most Posts</option>
                    <option value="most-reported">Sort: Most Reported</option>
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                </select>

                {hasUsersFilterChanges && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono border border-emerald-500/25 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-emerald-700 dark:text-green-300">
                            {activeUsersFilterCount} active
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setUsersFilter("");
                                setUsersBanFilter("all");
                                setUsersActivityFilter("all");
                                setUsersSort("most-posts");
                            }}
                            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-green-500/30 text-sm text-slate-700 dark:text-green-300 hover:bg-slate-50 dark:hover:bg-green-500/10 transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>
            {(usersFilter || usersBanFilter !== "all" || usersActivityFilter !== "all") && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-green-300/70">
                        Found {filteredUsers.length} of {users.length} users
                    </p>
                )}

            <Panel>
                <DataTable
                    columns={[
                        {
                            key: "anon_id",
                            label: "Anon ID | Username",
                            render: (u: AdminUser) => (
                                <span className="font-mono">
                                    {u.anon_id.slice(0, 8)} | {u.username}
                                </span>
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
                            key: "reported_posts",
                            label: "Posts Reported",
                            render: (u: AdminUser) => (
                                <span className="font-mono">{u.reported_posts}</span>
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
                        {
                            key: "actions",
                            label: "Actions",
                            render: (u: AdminUser) => {
                                if (u.is_banned) {
                                    return (
                                        <span className="inline-flex items-center rounded-lg px-3 py-1 text-xs border border-amber-400/40 text-amber-700 dark:border-amber-500/40 dark:text-amber-300">
                                            {u.ban_label || "Banned"}
                                        </span>
                                    );
                                }

                                return (
                                    <button
                                        type="button"
                                        onClick={() => openBanModal(u)}
                                        className="rounded-lg px-3 py-1 text-xs border border-red-400/40 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                                    >
                                        Ban User
                                    </button>
                                );
                            },
                        },
                    ]}
                    data={filteredUsers}
                    keyExtractor={(u) => u.anon_id}
                    emptyMessage={usersFilter || usersBanFilter !== "all" || usersActivityFilter !== "all" ? "No users match current filters" : "No users found"}
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

            {/* Delete Audit Logs Confirmation Modal */}
            <ConfirmationModal
                open={deleteAuditModalOpen}
                onClose={() => setDeleteAuditModalOpen(false)}
                onConfirm={handleConfirmDeleteAuditLogs}
                title="Delete Audit Logs"
                message={`Are you sure you want to delete ${selectedAuditLogs.size} audit log${selectedAuditLogs.size !== 1 ? 's' : ''}? This action cannot be undone.`}
                confirmText={`Delete ${selectedAuditLogs.size} Log${selectedAuditLogs.size !== 1 ? 's' : ''}`}
                cancelText="Cancel"
                danger={true}
            />

            {/* Clear All Audit Logs Confirmation Modal */}
            <ConfirmationModal
                open={clearAuditModalOpen}
                onClose={() => setClearAuditModalOpen(false)}
                onConfirm={handleConfirmClearAuditLogs}
                title="Clear All Audit Logs"
                message="Are you sure you want to clear ALL audit logs? This will permanently delete all audit trail records and cannot be undone."
                confirmText="Clear All Logs"
                cancelText="Cancel"
                danger={true}
            />

            {/* Post Detail Modal */}
            <PostDetailModal
                open={postDetailModalOpen}
                postId={selectedPostId}
                reportCount={selectedPostReportCount}
                onDelete={allowDeleteFromPostModal && selectedPostId ? () => handleDeletePost(selectedPostId, false) : undefined}
                onClose={() => {
                    setPostDetailModalOpen(false);
                    setSelectedPostId(null);
                    setSelectedPostReportCount(0);
                    setAllowDeleteFromPostModal(false);
                }}
            />

            {banModalOpen && selectedUserForBan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg mx-4 rounded-2xl border border-emerald-500/20 dark:border-green-500/30 bg-white/95 dark:bg-black/90 backdrop-blur-xl shadow-2xl shadow-emerald-500/10 dark:shadow-green-500/20">
                        <div className="p-6 pb-4">
                            <h2 className="text-xl font-semibold text-slate-950 dark:text-green-100">Ban User</h2>
                            <p className="mt-2 text-sm text-slate-700 dark:text-green-300/80">
                                Select ban duration for user <span className="font-mono">{selectedUserForBan.anon_id.slice(0, 8)}</span>.
                            </p>
                        </div>

                        <div className="px-6 pb-2 space-y-2">
                            {BAN_DURATION_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-2 rounded-lg border border-emerald-500/15 dark:border-green-500/20 px-3 py-2 cursor-pointer hover:bg-emerald-500/5 dark:hover:bg-green-500/10"
                                >
                                    <input
                                        type="radio"
                                        name="ban-duration"
                                        value={option.value}
                                        checked={selectedBanDuration === option.value}
                                        onChange={(e) => setSelectedBanDuration(e.target.value)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm text-slate-800 dark:text-green-200">{option.label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-green-300/10">
                            <button
                                type="button"
                                onClick={closeBanModal}
                                disabled={isSubmittingBan}
                                className="rounded-xl px-4 py-2 text-sm font-mono border border-slate-300 dark:border-green-500/30 bg-white dark:bg-black/50 text-slate-700 dark:text-green-300 hover:bg-slate-50 dark:hover:bg-green-500/10 disabled:opacity-75 disabled:cursor-not-allowed transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmBanUser}
                                disabled={isSubmittingBan}
                                className="rounded-xl px-4 py-2 text-sm font-mono border border-red-400/40 dark:border-red-500/40 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/20 dark:hover:bg-red-500/30 disabled:opacity-75 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmittingBan ? "Banning..." : "Ban User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
