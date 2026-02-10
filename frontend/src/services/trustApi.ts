import { apiFetch } from "./api";

export async function fetchTrustStatus() {
    return apiFetch<{
        incoming: any[];
        outgoing: any[];
    }>("/trust/status");
}

export async function respondTrust(
    requestId: string,
    decision: "accepted" | "declined"
    ) {
    return apiFetch("/trust/respond", {
        method: "POST",
        body: JSON.stringify({
        request_id: requestId,
        decision,
        }),
    });
}

// ✅ THIS WAS MISSING
export async function requestTrust(code: string) {
    return apiFetch("/trust/request", {
        method: "POST",
        body: JSON.stringify({ code }),
    });
    }
