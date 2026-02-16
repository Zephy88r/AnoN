import { apiFetch, setSessionToken } from "./api";
import { storage } from "./storage";

type BootstrapResp = { token: string; anon_id: string };

const ANON_ID_KEY = "anon_id";
const SESSION_EXPIRY_KEY = "session_expiry";

// Global session ready flag
let sessionIsReady = false;

export function isSessionReady(): boolean {
    return sessionIsReady;
}

export async function bootstrapSession(): Promise<string> {
    const res = await apiFetch<BootstrapResp>(
        "/session/bootstrap",
        {
        method: "POST",
        body: JSON.stringify({ device_key: "web", region: "Koshi" }),
        },
        { auth: false } // ✅ critical
    );

    setSessionToken(res.token);
    storage.setJSON(ANON_ID_KEY, res.anon_id);
    
    // Store session expiration (30 minutes from now)
    const expiryTime = Date.now() + 30 * 60 * 1000;
    storage.setJSON(SESSION_EXPIRY_KEY, expiryTime);
    
    sessionIsReady = true;
    return res.token;
}

export function getMyAnonId(): string | null {
    return storage.getJSON<string | null>(ANON_ID_KEY, null);
}

export async function refreshSession(): Promise<void> {
    try {
        const res = await apiFetch<BootstrapResp>(
            "/session/refresh",
            {
                method: "POST",
            },
            { auth: true }
        );

        setSessionToken(res.token);
        
        // Update session expiration
        const expiryTime = Date.now() + 30 * 60 * 1000;
        storage.setJSON(SESSION_EXPIRY_KEY, expiryTime);
        
        console.log("[Session] Refreshed successfully");
    } catch (error) {
        console.error("[Session] Refresh failed:", error);
        throw error;
    }
}

export function getSessionExpiryTime(): number | null {
    return storage.getJSON<number | null>(SESSION_EXPIRY_KEY, null);
}

export function isSessionExpired(): boolean {
    const expiryTime = getSessionExpiryTime();
    if (!expiryTime) return false;
    return Date.now() >= expiryTime;
}

export function getTimeUntilExpiry(): number {
    const expiryTime = getSessionExpiryTime();
    if (!expiryTime) return 0;
    return Math.max(0, expiryTime - Date.now());
}

export function clearSession(): void {
    storage.remove(ANON_ID_KEY);
    storage.remove(SESSION_EXPIRY_KEY);
    setSessionToken(null);
    sessionIsReady = false;
}
