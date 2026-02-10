import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    } from "react";
import { fetchTrustStatus, respondTrust } from "../services/trustApi";
import { getSessionToken } from "../services/api";

export type TrustStatus = "none" | "pending" | "accepted" | "declined";

export type TrustRequest = {
    id: string;
    peerKey: string; // anon id (other side)
    code?: string;
    status: Exclude<TrustStatus, "none">;
    createdAtISO?: string;
};

    type TrustContextValue = {
    requests: TrustRequest[];
    acceptRequest: (id: string) => Promise<void>;
    declineRequest: (id: string) => Promise<void>;
    isTrusted: (peerKey: string) => boolean;
    getStatusForUser: (peerKey: string) => TrustStatus;
    refresh: () => Promise<void>;
    };

    const TrustContext = createContext<TrustContextValue | null>(null);

export function TrustProvider({ children }: { children: React.ReactNode }) {
    const [requests, setRequests] = useState<TrustRequest[]>([]);

    const refresh = async () => {
        // ✅ If session not ready yet, skip (prevents 401 spam)
        if (!getSessionToken()) return;

        try {
        const res = await fetchTrustStatus();

        const all: TrustRequest[] = [
            ...res.incoming.map((r) => ({
            id: r.request_id,
            peerKey: r.from_anon ?? "",
            code: r.code,
            status: r.status,
            createdAtISO: r.created_at || r.updated_at,
            })),
            ...res.outgoing.map((r) => ({
            id: r.request_id,
            peerKey: r.to_anon ?? "",
            code: r.code,
            status: r.status,
            createdAtISO: r.created_at || r.updated_at,
            })),
        ];

        // 🔒 Deduplicate by request_id
        const deduped = Array.from(new Map(all.map((r) => [r.id, r])).values());

        setRequests(deduped);
        } catch (err) {
        // ✅ Don't crash UI; just log
        console.error("trust refresh failed:", err);
        }
    };

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 5000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const acceptRequest = async (id: string) => {
        await respondTrust(id, "accepted");
        await refresh();
    };

    const declineRequest = async (id: string) => {
        await respondTrust(id, "declined");

        const req = requests.find(r => r.id === id);
        if (req) {
            ensureThread(req.peerKey); 
        }
        await refresh();
    };

    const isTrusted = (peerKey: string) =>
        requests.some((r) => r.peerKey === peerKey && r.status === "accepted");

    const getStatusForUser = (peerKey: string): TrustStatus => {
        const r = requests.find((r) => r.peerKey === peerKey);
        return r ? r.status : "none";
    };

    const value = useMemo(
        () => ({
        requests,
        acceptRequest,
        declineRequest,
        isTrusted,
        getStatusForUser,
        refresh,
        }),
        [requests]
    );

    return <TrustContext.Provider value={value}>{children}</TrustContext.Provider>;
}

export function useTrust() {
    const ctx = useContext(TrustContext);
    if (!ctx) throw new Error("useTrust must be used within TrustProvider");
    return ctx;
}
