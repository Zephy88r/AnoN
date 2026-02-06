// src/services/geo.ts
export type GeoMode = "ghost" | "reveal";


export type GeoRegion = string; // "NEPAL • BAGMATI" etc.

export type GeoPing = {
    userKey: string;
    label: string;
    distanceM: number; // coarse/rounded
    lastSeenISO: string;
    signal: "low" | "med" | "high";
    hint: string;

    // UI placement (0..100) - can be server-provided later
    x: number;
    y: number;
};

export type PulsePayload = {
    region: GeoRegion;
    mode: GeoMode;
    // coarse location + jittered
    lat: number;
    lon: number;
    accuracyM: number;
    tsISO: string;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/**
 * Round location to reduce precision (privacy)
 * - ghost: ~2 decimal places (~1.1km)
 * - reveal: ~3 decimal places (~110m) (still not exact)
 */
export function roundLocation(lat: number, lon: number, mode: GeoMode) {
    const places = mode === "ghost" ? 2 : 3;
    const p = Math.pow(10, places);
    return {
        lat: Math.round(lat * p) / p,
        lon: Math.round(lon * p) / p,
    };
}

/**
 * Add small random jitter to avoid "same exact point" (privacy)
 * - ghost: bigger jitter
 * - reveal: smaller jitter
 */
export function jitterLocation(lat: number, lon: number, mode: GeoMode) {
    // approx degrees: 0.01 ~ 1.1km (lat)
    const j = mode === "ghost" ? 0.01 : 0.003; // ~1.1km vs ~330m
    const rand = () => (Math.random() - 0.5) * 2 * j;
    return { lat: lat + rand(), lon: lon + rand() };
}

/**
 * Deterministic-ish seed from region + rounded coords (used for stable UI positions)
 * This is just to keep dots from teleporting every refresh while still not exposing real coords.
 */
export function stable01(seed: string) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    // 0..1
    return (h >>> 0) / 4294967295;
}

/**
 * Backend adapter (later):
 * - pulse(): POST /geo/pulse
 * - fetchPings(): GET /geo/pings?region=...
 *
 * For now, we simulate a server in localStorage.
 */

const LS_KEY = "ghost_geo_pulses_v1";

type StoredPulse = PulsePayload & { anonKey: string };

function loadPulses(): StoredPulse[] {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw) as StoredPulse[];
        if (!Array.isArray(data)) return [];
        return data;
    } catch {
        return [];
    }
    }

    function savePulses(pulses: StoredPulse[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(pulses));
    }

    // device anon id (temporary)
    export function getAnonDeviceKey() {
    const key = "ghost_anon_device_key_v1";
    let v = localStorage.getItem(key);
    if (!v) {
        v = `dev_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
        localStorage.setItem(key, v);
    }
    return v;
    }

    // TTL cleanup (keep recent pulses only)
    const TTL_MS = 1000 * 60 * 30; // 30 minutes

    export async function pulse(payload: PulsePayload) {
    const anonKey = getAnonDeviceKey();
    const now = Date.now();

    const pulses = loadPulses()
        .filter((p) => now - Date.parse(p.tsISO) < TTL_MS) // keep fresh
        .filter((p) => p.region === payload.region); // simple region partition

    // upsert for this device (latest only)
    const withoutMe = pulses.filter((p) => p.anonKey !== anonKey);
    const next: StoredPulse[] = [...withoutMe, { ...payload, anonKey }];

    savePulses(next);
    return { ok: true };
    }

export async function fetchPings(region: GeoRegion): Promise<GeoPing[]> {
    const now = Date.now();
    const pulses = loadPulses()
        .filter((p) => p.region === region)
        .filter((p) => now - Date.parse(p.tsISO) < TTL_MS);

    // Simulate “nearby” list derived from pulses:
    // (We don't do true geo distance yet; we just produce coarse pings with stable UI coords.)
    return pulses.map((p, idx) => {
        const seed = `${p.anonKey}|${p.region}|${p.lat.toFixed(3)}|${p.lon.toFixed(3)}`;
        const sx = stable01(seed + "|x");
        const sy = stable01(seed + "|y");

        // Keep dots away from edges & from the center marker a bit
        const x = clamp(10 + sx * 80, 10, 90);
        const y = clamp(12 + sy * 76, 12, 88);

        const ageMs = now - Date.parse(p.tsISO);
        const minutes = Math.max(1, Math.round(ageMs / 60000));

        // fake signal from accuracy + freshness
        const signal: GeoPing["signal"] =
        minutes <= 3 ? "high" : minutes <= 10 ? "med" : "low";

        // fake distance from jittered coords magnitude (purely cosmetic)
        const distanceM = p.mode === "ghost" ? 400 + idx * 150 : 120 + idx * 120;

        const numericId = Math.floor(stable01(p.anonKey) * 900000) + 100000;


        return {
        userKey: `user_${p.anonKey.slice(0, 8)}`,
        label: `User #${numericId}`,
        distanceM,
        lastSeenISO: p.tsISO,
        signal,
        hint: p.mode === "ghost" ? "ghost pulse" : "coarse reveal",
        x,
        y,
        };
    });
}
