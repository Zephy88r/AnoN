import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type TrustStatus = "pending" | "accepted" | "declined";

export type TrustRequest = {
    id: string;              // unique request id
    fromLabel: string;       // e.g. "User #483921"
    fromUserKey: string;     // stable key for the sender (used to unlock chat)
    postId?: number;         // optional (tie to feed post)
    note?: string;           // optional note
    createdAtISO: string;    // time created
    status: TrustStatus;
};

type TrustContextValue = {
    requests: TrustRequest[];
    submitTrustRequest: (req: Omit<TrustRequest, "id" | "status" | "createdAtISO"> & { note?: string }) => void;
    acceptRequest: (requestId: string) => void;
    declineRequest: (requestId: string) => void;
    isTrusted: (userKey: string) => boolean;
    getStatusForUser: (userKey: string) => TrustStatus | "none";

};

const TrustContext = createContext<TrustContextValue | null>(null);

const STORAGE_KEY = "ghost_trust_requests_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function makeId() {
    return `tr_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function TrustProvider({ children }: { children: React.ReactNode }) {
    const [requests, setRequests] = useState<TrustRequest[]>(() =>
        safeParse<TrustRequest[]>(localStorage.getItem(STORAGE_KEY), [])
    
    );
    const getStatusForUser = (userKey: string) => {
    const match = requests.find((r) => r.fromUserKey === userKey);
    return match ? match.status : "none";
    };


  // persist
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }, [requests]);

    const submitTrustRequest: TrustContextValue["submitTrustRequest"] = (req) => {
        const newReq: TrustRequest = {
        id: makeId(),
        fromLabel: req.fromLabel,
        fromUserKey: req.fromUserKey,
        postId: req.postId,
        note: req.note?.trim() || undefined,
        createdAtISO: new Date().toISOString(),
        status: "pending",
        };

    // UI-only: push to top
    setRequests((prev) => [newReq, ...prev]);
    };

    const acceptRequest = (requestId: string) => {
        setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "accepted" } : r))
        );
    };

    const declineRequest = (requestId: string) => {
        setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "declined" } : r))
        );
    };

    const isTrusted = (userKey: string) => {
        return requests.some((r) => r.fromUserKey === userKey && r.status === "accepted");
    };

    const value = useMemo(
        () => ({ requests, submitTrustRequest, acceptRequest, declineRequest, isTrusted, getStatusForUser }),
        [requests]
    );


    return <TrustContext.Provider value={value}>{children}</TrustContext.Provider>;
}

export function useTrust() {
    const ctx = useContext(TrustContext);
    if (!ctx) throw new Error("useTrust must be used within TrustProvider");
    return ctx;
}
