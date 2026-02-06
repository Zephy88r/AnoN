import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ChatTextMessage = {
    id: string;
    fromMe: boolean;
    text: string;
    createdAtISO: string;
    };

    type ChatContextValue = {
    getThreadMessages: (threadId: string) => ChatTextMessage[];
    sendText: (threadId: string, text: string) => void;
    getLastMessage: (threadId: string) => ChatTextMessage | null;
    };

    const ChatContext = createContext<ChatContextValue | null>(null);

    const STORAGE_KEY = "ghost_chat_messages_v1";

    type StoreShape = Record<string, ChatTextMessage[]>;

    function safeParse<T>(raw: string | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
    }

    function makeId() {
    return `m_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    }

    export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [store, setStore] = useState<StoreShape>(() =>
        safeParse<StoreShape>(localStorage.getItem(STORAGE_KEY), {})
    );

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }, [store]);

    const getThreadMessages = (threadId: string) => store[threadId] ?? [];

    const sendText = (threadId: string, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const msg: ChatTextMessage = {
        id: makeId(),
        fromMe: true,
        text: trimmed,
        createdAtISO: new Date().toISOString(),
        };

        setStore((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), msg],
        }));
    };

    const getLastMessage = (threadId: string) => {
        const arr = store[threadId];
        if (!arr || arr.length === 0) return null;
        return arr[arr.length - 1];
    };

    const value = useMemo(
        () => ({ getThreadMessages, sendText, getLastMessage }),
        [store]
    );

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
    }

    export function useChat() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChat must be used within ChatProvider");
    return ctx;
}
