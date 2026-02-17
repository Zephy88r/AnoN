import { storage } from "./storage";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const TOKEN_KEY = "ghost_token"; // storage prefixes with ghost:
const LEGACY_TOKEN_KEY = "session_token";

// Track if we're currently rebootstrapping to prevent infinite loops
let isRebootstrapping = false;
let rebootstrapPromise: Promise<void> | null = null;

function unwrapToken(raw: unknown): string | null {
  // raw might already be string OR stringified string
    if (typeof raw !== "string" || !raw) return null;

    let s: unknown = raw;

  // unwrap up to 2 times (covers '"token"' and '"\"token\""' cases)
    for (let i = 0; i < 2; i++) {
        if (typeof s === "string" && s.startsWith('"') && s.endsWith('"')) {
        try {
            s = JSON.parse(s);
            continue;
        } catch {
            break;
        }
        }
        break;
    }

    return typeof s === "string" && s.length > 0 ? s : null;
}

export function getSessionToken(): string | null {
    const raw = storage.getJSON<string | null>(TOKEN_KEY, null);
    const token = unwrapToken(raw);
    if (token) return token;

    const legacyRaw = storage.getJSON<string | null>(LEGACY_TOKEN_KEY, null);
    const legacyToken = unwrapToken(legacyRaw);
    if (legacyToken) {
        storage.setJSON(TOKEN_KEY, legacyToken);
        storage.remove(LEGACY_TOKEN_KEY);
    }
    return legacyToken;
}

export function setSessionToken(token: string | null) {
    if (!token) {
        storage.remove(TOKEN_KEY);
        return;
    }
    storage.setJSON(TOKEN_KEY, token);
}

// Internal rebootstrap function - only called by apiFetch on 401
async function rebootstrapOnce(): Promise<void> {
    if (isRebootstrapping) {
        // Wait for existing rebootstrap to complete
        if (rebootstrapPromise) await rebootstrapPromise;
        return;
    }

    isRebootstrapping = true;
    rebootstrapPromise = (async () => {
        try {
            console.log("[api] 401 detected, rebootstrapping session...");
            // Use dynamic import to avoid circular dependency
            const { bootstrapSession } = await import("./session");
            await bootstrapSession();
            console.log("[api] rebootstrap complete");
        } catch (err) {
            console.error("[api] rebootstrap failed:", err);
            throw err;
        } finally {
            isRebootstrapping = false;
            rebootstrapPromise = null;
        }
    })();

    await rebootstrapPromise;
}

    export async function apiFetch<T>(
    path: string, 
    options: RequestInit = {},
    config?: { auth?: boolean; _isRetry?: boolean }
): Promise<T> {
    const url = `${API_BASE}${path}`;

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
    };

    if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    // ✅ Only attach auth if enabled (default true, can disable via config)
    const shouldAuth = config?.auth !== false;
    let tokenAttached = false;
    if (shouldAuth) {
        const token = getSessionToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
            tokenAttached = true;

            // 🔍 DEV-ONLY debug (do not log full token)
            if (import.meta.env.DEV) {
                console.log(`[api] auth header attached: len=${token.length}, startsWith=${token.startsWith("eyJ")}`);
            }
        }
    }

    const res = await fetch(url, { ...options, headers });

    // Log request details in dev mode
    if (import.meta.env.DEV) {
        console.log(`[api] ${options.method || 'GET'} ${path} - Status: ${res.status}`);
    }

    // ✅ Handle 401: rebootstrap once and retry
    if (res.status === 401 && shouldAuth && tokenAttached && !config?._isRetry) {
        console.log("[api] 401 unauthorized, attempting rebootstrap...");
        try {
            await rebootstrapOnce();
            // Retry the request with new token
            return apiFetch<T>(path, options, { ...config, _isRetry: true });
        } catch (err) {
            console.error("[api] rebootstrap failed, cannot retry:", err);
            // Fall through to normal error handling
        }
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[api] Error ${res.status} for ${path}:`, text);
        throw new Error(`API ${res.status}: ${text}`);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
}
