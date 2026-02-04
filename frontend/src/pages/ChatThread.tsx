import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeftIcon,
    PaperAirplaneIcon,
    LinkIcon,
} from "@heroicons/react/24/outline";

import LinkCardTile from "../components/LinkCardTile";
import type { LinkStatus } from "../components/LinkCardTile";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

type ChatItem =
    | {
        id: string;
        type: "text";
        fromMe: boolean;
        text: string;
        time: string;
        }
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

    const revokeLinkCard = (id: string) => {
        setItems((prev) =>
        prev.map((it) => {
            if (it.type !== "link_card") return it;
            if (it.id !== id) return it;

            // safety: only your active cards can be revoked
            if (!it.fromMe || it.status !== "active") return it;

            return {
            ...it,
            status: "revoked",
            meta: "revoked just now",
            };
        })
        );
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
                Trusted #A91F
                </div>
                <div className="text-xs text-slate-600 dark:text-green-300/70">
                Encrypted • Trusted channel
                </div>
            </div>
            </div>

            {/* Generate Link Card (UI-only placeholder) */}
            <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm
                border border-emerald-500/25 dark:border-green-500/25
                bg-emerald-500/10 dark:bg-green-500/10
                text-slate-800 dark:text-green-200
                hover:bg-emerald-500/15 dark:hover:bg-green-500/15
                ${focusRing}`}
            title="Generate Link Card (UI only)"
            >
            <LinkIcon className="h-5 w-5" />
            Link Card
            </button>
        </div>

        {/* Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 px-2">
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
                onRevoke={
                    item.fromMe && item.status === "active"
                    ? () => revokeLinkCard(item.id)
                    : undefined
                }
                />
            )
            )}
        </div>

        {/* Composer (disabled) */}
        <div className={`${card} mt-4 p-3`}>
            <div className="flex items-center gap-3">
            <input
                disabled
                placeholder="Type a message…"
                className={`flex-1 rounded-xl bg-transparent px-3 py-2
                text-slate-900 dark:text-green-100
                placeholder:text-slate-500 dark:placeholder:text-green-300/50
                outline-none ${focusRing}`}
            />

            <button
                disabled
                type="button"
                className="rounded-xl p-2 border border-emerald-500/25 dark:border-green-500/25 text-slate-400 dark:text-green-400/40 cursor-not-allowed"
                aria-label="Send"
            >
                <PaperAirplaneIcon className="h-5 w-5" />
            </button>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-green-300/60">
            Messaging unlocked via trust
            </div>
        </div>
        </div>
    );
    }

    /* ---------- Text Bubble ---------- */

    function TextBubble({ fromMe, text, time }: { fromMe: boolean; text: string; time: string }) {
    const base = "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed";

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
