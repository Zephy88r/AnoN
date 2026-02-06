// src/hooks/useGeoPings.ts
import { useEffect, useMemo, useRef, useState } from "react";
// src/hooks/useGeoPings.ts
import { fetchPings, jitterLocation, pulse, roundLocation } from "../services/geo";
import type { GeoMode, GeoPing, GeoRegion } from "../services/geo";


type UseGeoPingsArgs = {
    region: GeoRegion;
    mode: GeoMode; // "ghost" | "reveal"
    enabled?: boolean;
};

type GeoState =
    | { status: "idle" }
    | { status: "unsupported" }
    | { status: "denied" }
    | { status: "watching" }
    | { status: "error"; message: string };

export function useGeoPings({ region, mode, enabled = true }: UseGeoPingsArgs) {
    const [geoState, setGeoState] = useState<GeoState>({ status: "idle" });
    const [pings, setPings] = useState<GeoPing[]>([]);
    const watchIdRef = useRef<number | null>(null);
    const lastPulseAtRef = useRef<number>(0);

    // throttle pulses (privacy + battery)
    const PULSE_THROTTLE_MS = 15000; // 15s

    const canUse = useMemo(() => enabled && !!region, [enabled, region]);

    useEffect(() => {
        if (!canUse) return;

        if (!("geolocation" in navigator)) {
        setGeoState({ status: "unsupported" });
        return;
        }

        let cancelled = false;

        const startWatch = () => {
        setGeoState({ status: "watching" });

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
            if (cancelled) return;

            const now = Date.now();
            if (now - lastPulseAtRef.current < PULSE_THROTTLE_MS) return;
            lastPulseAtRef.current = now;

            const latRaw = pos.coords.latitude;
            const lonRaw = pos.coords.longitude;
            const accuracyM = Math.round(pos.coords.accuracy || 0);

            // privacy transforms
            const rounded = roundLocation(latRaw, lonRaw, mode);
            const jittered = jitterLocation(rounded.lat, rounded.lon, mode);

            await pulse({
                region,
                mode,
                lat: jittered.lat,
                lon: jittered.lon,
                accuracyM,
                tsISO: new Date().toISOString(),
            });

            const list = await fetchPings(region);
            if (!cancelled) setPings(list);
            },
            (err) => {
            if (cancelled) return;
            if (err.code === err.PERMISSION_DENIED) {
                setGeoState({ status: "denied" });
            } else {
                setGeoState({ status: "error", message: err.message || "Geo error" });
            }
            },
            {
            enableHighAccuracy: false, // privacy-first
            maximumAge: 10000,
            timeout: 10000,
            }
        );
        };

        startWatch();

        // initial fetch (in case there are pulses already)
        fetchPings(region).then((list) => {
        if (!cancelled) setPings(list);
        });

        return () => {
        cancelled = true;
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        };
    }, [canUse, region, mode]);

    // Poll pings lightly (so UI updates even if you aren't moving)
    useEffect(() => {
        if (!canUse) return;
        const t = window.setInterval(async () => {
        const list = await fetchPings(region);
        setPings(list);
        }, 10000); // 10s
        return () => window.clearInterval(t);
    }, [canUse, region]);

    return { geoState, pings };
}
