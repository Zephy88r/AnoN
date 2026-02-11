import { apiFetch } from "./api";
import { storage } from "./storage";

const ADMIN_TOKEN_STORAGE = "admin_token";

export type AdminPost = {
    id: string;
    anon_id: string;
    text: string;
    created_at: string;
};

export type AdminUser = {
    anon_id: string;
    created_at: string;
    post_count: number;
};

export type AdminStats = {
    total_posts: number;
    total_users: number;
    total_sessions: number;
    avg_posts_per_day: number;
    top_posters: { anon_id: string; post_count: number }[];
};

export type AdminSession = {
    anon_id: string;
    token: string;
    expires_at: string;
    created_at: string;
};

export type TrustLink = {
    from: string;
    to: string;
    status: string;
    created_at: string;
};

export type AbuseReport = {
    anon_id: string;
    post_count: number;
    last_post_at: string;
    rate_status: string;
};

export type AuditLog = {
    id: string;
    action: string;
    anon_id: string;
    details: string;
    timestamp: string;
};

export type AdminLoginResponse = {
    token: string;
};

export function getAdminToken(): string | null {
    return storage.getJSON<string | null>(ADMIN_TOKEN_STORAGE, null);
}

export function setAdminToken(token: string) {
    storage.setJSON(ADMIN_TOKEN_STORAGE, token);
}

export function clearAdminToken() {
    storage.remove(ADMIN_TOKEN_STORAGE);
}

export async function loginAdmin(email: string, password: string) {
    return apiFetch<AdminLoginResponse>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    }, { auth: false });
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getAdminToken();
    if (!token) throw new Error("Admin session required");

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
    };

    return apiFetch<T>(`/admin${path}`, { ...options, headers }, { auth: false });
}

export async function fetchAdminPosts() {
    return adminFetch<{ posts: AdminPost[]; total: number }>("/posts");
}

export async function deleteAdminPost(postId: string) {
    return adminFetch<{ message: string; post_id: string }>("/posts/delete", {
        method: "POST",
        body: JSON.stringify({ post_id: postId }),
    });
}

export async function fetchAdminUsers() {
    return adminFetch<{ users: AdminUser[]; total: number }>("/users");
}

export async function fetchAdminStats() {
    return adminFetch<AdminStats>("/stats");
}

export async function fetchAdminSessions() {
    return adminFetch<{ sessions: AdminSession[]; total: number }>("/sessions");
}

export async function fetchAdminTrust() {
    return adminFetch<{ trust_links: TrustLink[]; total: number }>("/trust");
}

export async function fetchAdminAbuse() {
    return adminFetch<{ abuse_reports: AbuseReport[]; total_users: number; warning_count: number }>("/abuse");
}

export async function fetchAdminAudit() {
    return adminFetch<{ logs: AuditLog[]; total: number }>("/audit");
}

export async function fetchAdminHealth() {
    return adminFetch<{ status: string; timestamp: string; uptime: string }>("/health");
}
