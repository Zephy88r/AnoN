import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, PaperAirplaneIcon, LinkIcon } from "@heroicons/react/24/outline";

import LinkCardTile from "../components/LinkCardTile";
import type { LinkStatus } from "../components/LinkCardTile";
import { useTrust } from "../contexts/TrustContext";
import { useChat } from "../contexts/ChatContext";
import { getThreadById } from "../services/thread";
import { connectChatWS } from "../services/chatWs";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

type ChatItem =
    | { id: string; type: "text"; fromMe: boolean; text: string; time: string }
    | {
        id: string;
        type: "link_card";
        fromMe: boolean;
        code: string;
        expiresIn: string;
        note?: string;
        time: string;
        status: LinkStatus;
        meta?: string;
    };

export default function ChatThread() {
    const navigate = useNavigate();
    const { threadId = "" } = useParams();

    const { getStatusForUser } = useTrust();
    const { getThreadMessages, sendText } = useChat();

    const thread = useMemo(() => (threadId ? getThreadById(threadId) : null), [threadId]);
    const peerAnonId = thread?.peerAnonId;

    const status = useMemo(
        () => (peerAnonId ? getStatusForUser(peerAnonId) : "none"),
        [peerAnonId, getStatusForUser]
    );
    const trusted = status === "accepted";

    // ✅ WebSocket connection
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState(false);

    useEffect(() => {
        if (!trusted || !peerAnonId) return;

        let mounted = true;

        (async () => {
            try {
                const socket = await connectChatWS(peerAnonId, {
                    onOpen: () => {
                        if (mounted) {
                            console.log("[ChatThread] WS opened");
                            setWsConnected(true);
                        }
                    },
                    onMessage: (data: unknown) => {
                        if (!mounted || !threadId) return;
                        const msg = data as { type?: string; text?: string; from?: string };
                        if (msg.type === "text" && msg.text) {
                            console.log("[ChatThread] received:", msg);
                        }
                    },
                    onClose: () => {
                        if (mounted) {
                            console.log("[ChatThread] WS closed");
                            setWsConnected(false);
                        }
                    },
                    onError: (err) => {
                        console.error("[ChatThread] WS error:", err);
                    },
                });

                if (mounted) {
                    setWs(socket);
                }
            } catch (err) {
                console.error("[ChatThread] failed to connect WS:", err);
            }
        })();

        return () => {
            mounted = false;
            if (ws) {
                ws.close();
                setWs(null);
                setWsConnected(false);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trusted, peerAnonId, threadId]);

    // Demo items (static)
    const initialItems: ChatItem[] = useMemo(
        () => [
        { id: "m1", type: "text", fromMe: false, text: "You got the invite code?", time: "09:12" },
        { id: "m2", type: "text", fromMe: true, text: "Yes. Sent it an hour ago.", time: "09:13" },
        {
            id: "l1",
            type: "link_card",
            fromMe: true,
            code: "X9K2-4P7Q",
            expiresIn: "24h",
            note: "Use this to reach me on a new device.",
            time: "09:14",
            status: "active",
        },
        { id: "m3", type: "text", fromMe: false, text: "Received. I’ll use it later.", time: "09:15" },
        {
            id: "l2",
            type: "link_card",
            fromMe: false,
            code: "M1Q0-8Z2A",
            expiresIn: "6h",
            note: "Backup contact bridge.",
            time: "09:16",
            status: "used",
            meta: "used 2m ago",
        },
        {
            id: "l3",
            type: "link_card",
            fromMe: true,
            code: "R7T1-0K9C",
            expiresIn: "24h",
            note: "Old card (revoked).",
            time: "Yesterday",
            status: "revoked",
            meta: "revoked by you",
        },
        {
            id: "l4",
            type: "link_card",
            fromMe: true,
            code: "Q2W8-6H1P",
            expiresIn: "24h",
            note: "Expired demo.",
            time: "3d ago",
            status: "expired",
            meta: "expired 1d ago",
        },
        ],
        []
    );

    const [items, setItems] = useState<ChatItem[]>(initialItems);
    const [draft, setDraft] = useState("");

    const bottomRef = useRef<HTMLDivElement | null>(null);

    const revokeLinkCard = (id: string) => {
        setItems((prev) =>
        prev.map((it) => {
            if (it.type !== "link_card") return it;
            if (it.id !== id) return it;
            if (!it.fromMe || it.status !== "active") return it;
            return { ...it, status: "revoked", meta: "revoked just now" };
        })
        );
    };

    const headerLine =
        status === "accepted"
        ? "Encrypted • Trusted channel"
        : status === "pending"
            ? "Locked • Trust pending"
            : status === "declined"
            ? "Locked • Trust declined"
            : "Locked • Trust required";

    const savedMessages = threadId ? getThreadMessages(threadId) : [];

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        // wait a tick so DOM updates first
        requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior, block: "end" });
        });
    };

    // Scroll to latest on open / thread change
    useEffect(() => {
        scrollToBottom("auto");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);

    // Scroll to latest after new saved message
    useEffect(() => {
        scrollToBottom("smooth");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedMessages.length]);

    const doSend = () => {
        if (!trusted) return;
        if (!threadId) return;

        const text = draft.trim();
        if (!text) return;

        // ✅ Send via WebSocket if connected
        if (wsConnected && ws) {
            try {
                ws.send(JSON.stringify({ type: "text", text }));
            } catch (err) {
                console.error("[ChatThread] failed to send via WS:", err);
            }
        }

        // Store locally
        sendText(threadId, text);
        setDraft("");
        // scroll will happen via effect
    };

    return (
        <div className="mx-auto w-full max-w-3xl h-full flex flex-col">
        {/* Header */}
        <div className={`${card} mb-4 p-3 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate("/app/messages")}
                className={`rounded-lg p-1 hover:bg-emerald-500/10 ${focusRing}`}
                aria-label="Back"
            >
                <ArrowLeftIcon className="h-5 w-5 text-slate-700 dark:text-green-300" />
            </button>

            <div>
                <div className="font-mono text-sm text-slate-900 dark:text-green-200">
                {thread ? `peer: ${thread.peerAnonId.slice(0, 8)}…` : "Thread"}
                {status === "accepted" ? " • Trusted" : ""}
                {wsConnected && " • 🟢"}
                </div>
                <div className="text-xs text-slate-600 dark:text-green-300/70">{headerLine}</div>
            </div>
            </div>

            <button
            type="button"
            disabled={!trusted}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm
                border border-emerald-500/25 dark:border-green-500/25
                bg-emerald-500/10 dark:bg-green-500/10
                text-slate-800 dark:text-green-200
                hover:bg-emerald-500/15 dark:hover:bg-green-500/15
                disabled:opacity-60 disabled:cursor-not-allowed
                ${focusRing}`}
            title={trusted ? "Generate Link Card (UI only)" : "Trust required"}
            >
            <LinkIcon className="h-5 w-5" />
            Link Card
            </button>
        </div>

        {/* Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 px-2">
            {/* demo stream */}
            {items.map((item) =>
            item.type === "text" ? (
                <TextBubble key={item.id} fromMe={item.fromMe} text={item.text} time={item.time} />
            ) : (
                <LinkCardTile
                key={item.id}
                fromMe={item.fromMe}
                code={item.code}
                expiresIn={item.expiresIn}
                note={item.note}
                time={item.time}
                status={item.status}
                meta={item.meta}
                onRevoke={trusted && item.fromMe && item.status === "active" ? () => revokeLinkCard(item.id) : undefined}
                />
            )
            )}

            {/* saved messages (persisted) */}
            {savedMessages.map((m) => (
            <TextBubble
                key={m.id}
                fromMe={m.fromMe}
                text={m.text}
                time={new Date(m.createdAtISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
            ))}

            {/* bottom anchor */}
            <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className={`${card} mt-4 p-3`}>
            <div className="flex items-end gap-3">
            <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!trusted}
                rows={2}
                placeholder={trusted ? "Type a message… (Enter to send, Shift+Enter for new line)" : "Trust required to message"}
                onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    doSend();
                }
                }}
                className={`flex-1 resize-none rounded-xl bg-transparent px-3 py-2
                text-slate-900 dark:text-green-100
                placeholder:text-slate-500 dark:placeholder:text-green-300/50
                disabled:cursor-not-allowed disabled:opacity-60
                outline-none ${focusRing}`}
            />

            <button
                disabled={!trusted || draft.trim().length === 0}
                type="button"
                onClick={doSend}
                className="rounded-xl p-2 border border-emerald-500/25 dark:border-green-500/25
                text-slate-700 dark:text-green-200
                hover:bg-emerald-500/10 dark:hover:bg-green-500/10
                disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
            >
                <PaperAirplaneIcon className="h-5 w-5" />
            </button>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-green-300/60">
            {trusted ? "Messaging unlocked via trust" : "Messaging locked until trust is accepted"}
            </div>
        </div>
        </div>
    );
    }

    /* ---------- Text Bubble ---------- */

    function TextBubble({ fromMe, text, time }: { fromMe: boolean; text: string; time: string }) {
    const base = "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap";

    return fromMe ? (
        <div className="flex justify-end">
        <div
            className={`${base}
            bg-emerald-500/15 dark:bg-green-500/15
            text-slate-900 dark:text-green-100
            border border-emerald-500/25 dark:border-green-500/30`}
        >
            <div>{text}</div>
            <div className="mt-1 text-right text-xs text-slate-600 dark:text-green-300/60 font-mono">
            {time}
            </div>
        </div>
        </div>
    ) : (
        <div className="flex justify-start">
        <div
            className={`${base}
            bg-white/70 dark:bg-black/40
            text-slate-800 dark:text-green-200
            border border-emerald-500/15 dark:border-green-500/20`}
        >
            <div>{text}</div>
            <div className="mt-1 text-right text-xs text-slate-600 dark:text-green-300/60 font-mono">
            {time}
            </div>
        </div>
        </div>
    );
}
