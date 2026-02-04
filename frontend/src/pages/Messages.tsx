import {
    ChatBubbleLeftRightIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4";

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

export default function Messages() {
    const navigate = useNavigate();

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className={card}>
            <div className="flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-emerald-700 dark:text-green-300" />
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Messages
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                Private conversations with trusted ghosts
                </p>
            </div>
            </div>
        </div>

        {/* Requests */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Requests
            </div>

            <div className="space-y-3">
            <RequestRow anon="User #884201" time="1h ago" />
            <RequestRow anon="User #552901" time="6h ago" />
            </div>
        </div>

        {/* Chats */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Trusted Chats
            </div>

            <div className="space-y-2">
            <ChatRow
                anon="Trusted #A91F"
                preview="You there?"
                time="2m ago"
                onOpen={() => navigate("/app/messages/a91f")}
            />
            <ChatRow
                anon="Trusted #C204"
                preview="Sent the code."
                time="1d ago"
                onOpen={() => navigate("/app/messages/c204")}
            />
            </div>
        </div>
        </div>
    );
    }

    /* ---------- Components ---------- */

    function RequestRow({ anon, time }: { anon: string; time: string }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/15 dark:border-green-500/20 bg-white/50 dark:bg-black/35 px-3 py-2">
        <div>
            <div className="font-mono text-sm text-slate-900 dark:text-green-200">
            {anon}
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70 flex items-center gap-1">
            <ClockIcon className="h-4 w-4" />
            requested {time}
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm
                border border-emerald-600/25 dark:border-green-500/25
                bg-emerald-500/10 dark:bg-green-500/10
                text-slate-900 dark:text-green-200
                hover:bg-emerald-500/15 dark:hover:bg-green-500/15
                ${focusRing}`}
            >
            <CheckCircleIcon className="h-5 w-5" />
            Accept
            </button>

            <button
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm
                border border-slate-300 dark:border-green-500/15
                bg-white/60 dark:bg-black/30
                text-slate-700 dark:text-green-300/70
                hover:bg-slate-100 dark:hover:bg-green-500/10
                ${focusRing}`}
            >
            <XCircleIcon className="h-5 w-5" />
            Decline
            </button>
        </div>
        </div>
    );
    }

    function ChatRow({
    anon,
    preview,
    time,
    onOpen,
    }: {
    anon: string;
    preview: string;
    time: string;
    onOpen: () => void;
    }) {
    return (
        <button
        onClick={onOpen}
        className={`w-full text-left rounded-xl border border-emerald-500/15 dark:border-green-500/20
            bg-white/50 dark:bg-black/35 px-3 py-3
            hover:bg-emerald-500/10 dark:hover:bg-green-500/10
            ${focusRing}`}
        >
        <div className="flex items-center justify-between mb-1">
            <div className="font-mono text-sm text-slate-900 dark:text-green-200">
            {anon}
            </div>
            <div className="text-xs text-slate-600 dark:text-green-300/70">
            {time}
            </div>
        </div>

        <div className="text-sm text-slate-700 dark:text-green-300/80 truncate">
            {preview}
        </div>
        </button>
    );
}
