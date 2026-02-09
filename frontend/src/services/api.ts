const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

// api.ts (ONLY place that touches the token)

const TOKEN_KEY = "ghost:session_token";

export function getSessionToken(): string | null {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;

    try {
        const token = JSON.parse(raw); // unwrap once
        return typeof token === "string" ? token : null;
    } catch {
        return null;
    }
}

export function setSessionToken(token: string) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

    export async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
    ): Promise<T> {
    const url = `${API_BASE}${path}`;

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
    };

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    const token = getSessionToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text}`);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;

    return (await res.text()) as unknown as T;
}
