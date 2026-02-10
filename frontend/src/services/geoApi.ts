import { apiFetch } from "./api";

export type ApiGeoPingResponse = {
    anon_id: string;
    lat: number;
    lng: number;
    ts: string; // ISO 8601
};

export type ApiGeoNearbyResponse = {
    pings: ApiGeoPingResponse[];
};

export async function sendGeoPing(lat: number, lng: number) {
    return apiFetch<ApiGeoPingResponse>("/geo/ping", {
        method: "POST",
        body: JSON.stringify({ lat, lng }),
    });
}

export async function fetchNearbyPings(lat: number, lng: number, km: number = 5) {
    const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        km: km.toString(),
    });
    return apiFetch<ApiGeoNearbyResponse>(`/geo/nearby?${params.toString()}`);
}
