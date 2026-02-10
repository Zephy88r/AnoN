import { storage } from "./storage";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const TOKEN_KEY = "session_token"; // storage adds "ghost:" prefix

export function getSessionToken(): string | null {
    const raw = storage.getJSON<string | null>("session_token", null);

    if (!raw) return null;

    if (raw.startsWith('"') && raw.endsWith('"')) {
        try {
        const unwrapped = JSON.parse(raw);
        return typeof unwrapped === "string" ? unwrapped : null;
        } catch {
        return null;
        }
    }

    return raw;
}


export function setSessionToken(token: string) {
    storage.setJSON(TOKEN_KEY, token);
    }

    type ApiFetchOptions = {
    auth?: boolean; // default true
    };

    export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
    apiOpts: ApiFetchOptions = {}
    ): Promise<T> {
    const url = `${API_BASE}${path}`;
    const auth = apiOpts.auth !== false; // default true

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
    };

    if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    // ✅ Only require token when auth=true
    if (auth) {
        const token = getSessionToken();
        if (!token) {
        // This is the error you're seeing — now it will NOT happen for auth:false calls
        throw new Error("Missing session token");
        }
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text}`);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;

    return (await res.text()) as unknown as T;
}
