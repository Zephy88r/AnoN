import { apiFetch } from "./api";

export type ApiTrustItem = {
  request_id: string;
  code: string;
  status: "pending" | "accepted" | "declined";
  from_anon?: string;
  to_anon?: string;
};

export type ApiTrustStatus = {
  incoming: ApiTrustItem[];
  outgoing: ApiTrustItem[];
};

export function requestTrust(code: string) {
    return apiFetch<{ request_id: string; status: string }>("/trust/request", {
        method: "POST",
        body: JSON.stringify({ code }),
    });
}

export function respondTrust(requestId: string, decision: "accepted" | "declined") {
    return apiFetch("/trust/respond", {
        method: "POST",
        body: JSON.stringify({ request_id: requestId, decision }),
    });
}

export function fetchTrustStatus() {
    return apiFetch<ApiTrustStatus>("/trust/status");
}
