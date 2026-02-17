import { apiFetch, getSessionToken, setSessionToken } from "./api";
import { storage } from "./storage";

type DeviceChallengeResp = { nonce: string; expires_in_sec: number };
type BootstrapResp = { token: string; anon_id: string; username: string; expires_at: string };
type MeResp = { anon_id: string; username: string; expires_at: string };

const DEVICE_PUBLIC_ID_KEY = "ghost_device_public_id";
const DEVICE_SECRET_KEY = "ghost_device_secret";
const USERNAME_KEY = "ghost_username";
const ANON_ID_KEY = "ghost_anon_id";
const SESSION_EXPIRY_KEY = "ghost_session_expiry";
const LEGACY_ANON_ID_KEY = "anon_id";
const LEGACY_SESSION_EXPIRY_KEY = "session_expiry";

const DEFAULT_REGION = "NEPAL";
const PBKDF2_ITERS = 120000;

// Global session ready flag
let sessionIsReady = false;

export function isSessionReady(): boolean {
    return sessionIsReady;
}

function getDevicePublicId(): string | null {
    return storage.getJSON<string | null>(DEVICE_PUBLIC_ID_KEY, null);
}

function getDeviceSecret(): string | null {
    return storage.getJSON<string | null>(DEVICE_SECRET_KEY, null);
}

function hasDeviceKeys(): boolean {
    return !!getDevicePublicId() && !!getDeviceSecret();
}

function base64FromBytes(bytes: Uint8Array): string {
    let binary = "";
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary);
}

function bytesFromBase64(input: string): Uint8Array {
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function generateDevicePublicId(): string {
    if (crypto.randomUUID) return crypto.randomUUID();

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

function generateDeviceSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return base64FromBytes(bytes);
}

async function deriveDeviceSecretHash(deviceSecret: string, devicePublicId: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(deviceSecret),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: encoder.encode(devicePublicId),
            iterations: PBKDF2_ITERS,
            hash: "SHA-256",
        },
        keyMaterial,
        256
    );
    return base64FromBytes(new Uint8Array(bits));
}

async function computeProof(deviceSecretHash: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyBytes = bytesFromBase64(deviceSecretHash);
    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return base64FromBytes(new Uint8Array(signature));
}

function ensureDeviceKeys(): { devicePublicId: string; deviceSecret: string } {
    let devicePublicId = getDevicePublicId();
    let deviceSecret = getDeviceSecret();

    if (!devicePublicId) {
        devicePublicId = generateDevicePublicId();
        storage.setJSON(DEVICE_PUBLIC_ID_KEY, devicePublicId);
    }
    if (!deviceSecret) {
        deviceSecret = generateDeviceSecret();
        storage.setJSON(DEVICE_SECRET_KEY, deviceSecret);
    }

    return { devicePublicId, deviceSecret };
}

async function requestChallenge(devicePublicId: string): Promise<DeviceChallengeResp> {
    return apiFetch<DeviceChallengeResp>(
        "/device/challenge",
        {
            method: "POST",
            body: JSON.stringify({ device_public_id: devicePublicId }),
        },
        { auth: false }
    );
}

export async function bootstrapSession(region: string = DEFAULT_REGION): Promise<string> {
    const { devicePublicId, deviceSecret } = ensureDeviceKeys();
    const challenge = await requestChallenge(devicePublicId);

    const ts = Math.floor(Date.now() / 1000);
    const deviceSecretHash = await deriveDeviceSecretHash(deviceSecret, devicePublicId);
    const message = `${devicePublicId}|${challenge.nonce}|${ts}`;
    const proof = await computeProof(deviceSecretHash, message);

    const res = await apiFetch<BootstrapResp>(
        "/session/bootstrap",
        {
            method: "POST",
            body: JSON.stringify({
                device_public_id: devicePublicId,
                nonce: challenge.nonce,
                ts,
                proof,
                region,
                device_secret_hash: deviceSecretHash,
            }),
        },
        { auth: false }
    );

    setSessionToken(res.token);
    storage.setJSON(ANON_ID_KEY, res.anon_id);
    storage.setJSON(USERNAME_KEY, res.username);

    if (res.expires_at) {
        storage.setJSON(SESSION_EXPIRY_KEY, Date.parse(res.expires_at));
    }

    sessionIsReady = true;
    return res.token;
}

export async function loadSessionMe(): Promise<MeResp> {
    const res = await apiFetch<MeResp>(
        "/session/me",
        {
            method: "GET",
        },
        { auth: true }
    );

    storage.setJSON(ANON_ID_KEY, res.anon_id);
    storage.setJSON(USERNAME_KEY, res.username);
    if (res.expires_at) {
        storage.setJSON(SESSION_EXPIRY_KEY, Date.parse(res.expires_at));
    }
    sessionIsReady = true;
    return res;
}

export async function initSession(): Promise<boolean> {
    const token = getSessionToken();
    if (!token) return false;

    try {
        await loadSessionMe();
        return true;
    } catch (error) {
        console.error("[Session] /session/me failed:", error);
        if (!hasDeviceKeys()) {
            clearSession({ keepDeviceKeys: true });
            return false;
        }

        try {
            await bootstrapSession();
            return true;
        } catch (rebootstrapErr) {
            console.error("[Session] Rebootstrap failed:", rebootstrapErr);
            clearSession({ keepDeviceKeys: true });
            return false;
        }
    }
}

export function getMyAnonId(): string | null {
    const anonId = storage.getJSON<string | null>(ANON_ID_KEY, null);
    if (anonId) return anonId;

    const legacy = storage.getJSON<string | null>(LEGACY_ANON_ID_KEY, null);
    if (legacy) {
        storage.setJSON(ANON_ID_KEY, legacy);
        storage.remove(LEGACY_ANON_ID_KEY);
    }
    return legacy;
}

export function getMyUsername(): string | null {
    return storage.getJSON<string | null>(USERNAME_KEY, null);
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
        if (res.expires_at) {
            storage.setJSON(SESSION_EXPIRY_KEY, Date.parse(res.expires_at));
        }
        console.log("[Session] Refreshed successfully");
    } catch (error) {
        console.error("[Session] Refresh failed:", error);
        throw error;
    }
}

export function getSessionExpiryTime(): number | null {
    const expiry = storage.getJSON<number | null>(SESSION_EXPIRY_KEY, null);
    if (expiry) return expiry;

    const legacy = storage.getJSON<number | null>(LEGACY_SESSION_EXPIRY_KEY, null);
    if (legacy) {
        storage.setJSON(SESSION_EXPIRY_KEY, legacy);
        storage.remove(LEGACY_SESSION_EXPIRY_KEY);
    }
    return legacy;
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

export function clearSession(options: { keepDeviceKeys?: boolean } = {}): void {
    storage.remove(ANON_ID_KEY);
    storage.remove(USERNAME_KEY);
    storage.remove(SESSION_EXPIRY_KEY);
    setSessionToken(null);
    sessionIsReady = false;

    if (!options.keepDeviceKeys) {
        storage.remove(DEVICE_PUBLIC_ID_KEY);
        storage.remove(DEVICE_SECRET_KEY);
    }
}

export function logout(): void {
    clearSession({ keepDeviceKeys: true });
}
