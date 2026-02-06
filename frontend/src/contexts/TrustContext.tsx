import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { storage } from "../services/storage";

export type TrustStatus = "none" | "pending" | "accepted" | "declined";

export type TrustRequest = {
    id: string; // unique request id
    fromLabel: string; // e.g. "User #483921"
    fromUserKey: string; // stable key (used to unlock chat)
    postId?: number;
    note?: string;
    createdAtISO: string;
    status: Exclude<TrustStatus, "none">; // stored requests are never "none"
};

type TrustContextValue = {
    requests: TrustRequest[];
    submitTrustRequest: (req: {
        fromLabel: string;
        fromUserKey: string;
        postId?: number;
            note?: string;
    }) => void;
    acceptRequest: (requestId: string) => void;
    declineRequest: (requestId: string) => void;
    isTrusted: (userKey: string) => boolean;
    getStatusForUser: (userKey: string) => TrustStatus;
};

const TrustContext = createContext<TrustContextValue | null>(null);

// Storage config
const STORAGE_KEY = "trust_requests";
const STORAGE_VERSION = 1;

function makeId() {
    return `tr_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function TrustProvider({ children }: { children: React.ReactNode }) {
    const [requests, setRequests] = useState<TrustRequest[]>(() =>
        storage.getJSON<TrustRequest[]>(STORAGE_KEY, [], { version: STORAGE_VERSION })
    );

  // persist
    useEffect(() => {
        storage.setJSON(STORAGE_KEY, requests, { version: STORAGE_VERSION });
    }, [requests]);

    const submitTrustRequest: TrustContextValue["submitTrustRequest"] = (req) => {
        const note = req.note?.trim() || undefined;

        setRequests((prev) => {
        // DEDUPE: if a request already exists for this userKey, don't create a new one.
        const existing = prev.find((r) => r.fromUserKey === req.fromUserKey);

        // If already accepted or pending/declined, keep it (no retries by design)
        if (existing) return prev;

        const newReq: TrustRequest = {
            id: makeId(),
            fromLabel: req.fromLabel,
            fromUserKey: req.fromUserKey,
            postId: req.postId,
            note,
            createdAtISO: new Date().toISOString(),
            status: "pending",
        };

        return [newReq, ...prev];
        });
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

    const getStatusForUser = (userKey: string): TrustStatus => {
        const match = requests.find((r) => r.fromUserKey === userKey);
        return match ? match.status : "none";
    };

    const value = useMemo(
        () => ({
        requests,
        submitTrustRequest,
        acceptRequest,
        declineRequest,
        isTrusted,
        getStatusForUser,
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
