import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchTrustStatus, respondTrust } from "../services/trustApi";

export type TrustStatus = "none" | "pending" | "accepted" | "declined";

export type TrustRequest = {
    id: string;
    peerKey: string;
    code?: string;
    status: Exclude<TrustStatus, "none">;
    createdAtISO: string;
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
        const res = await fetchTrustStatus();

        const mapped: TrustRequest[] = [
        ...res.incoming.map((r) => ({
            id: r.request_id,
            peerKey: r.from_anon || "",
            code: r.code,
            status: r.status, // pending/accepted/declined
            createdAtISO: new Date().toISOString(),
        })),
        ...res.outgoing.map((r) => ({
            id: r.request_id,
            peerKey: r.to_anon || "",
            code: r.code,
            status: r.status, // pending/accepted/declined
            createdAtISO: new Date().toISOString(),
        })),
        ];

        setRequests(mapped);
    };

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 5000);
        return () => clearInterval(t);
    }, []);

    const acceptRequest = async (id: string) => {
        await respondTrust(id, "accepted");
        await refresh();
    };

    const declineRequest = async (id: string) => {
        await respondTrust(id, "declined");
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
