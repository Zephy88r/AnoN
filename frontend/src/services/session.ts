import { apiFetch, setSessionToken } from "./api";
import { storage } from "./storage";

type BootstrapResp = { token: string; anon_id: string };

const ANON_ID_KEY = "anon_id";

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
    sessionIsReady = true;
    return res.token;
}

export function getMyAnonId(): string | null {
    return storage.getJSON<string | null>(ANON_ID_KEY, null);
}
