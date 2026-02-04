import { useMemo, useState } from "react";
import {
    ShieldCheckIcon,
    KeyIcon,
    ClipboardDocumentIcon,
    UserPlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    } from "@heroicons/react/24/outline";

    const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

    type PendingRequest = {
    id: string;
    fromAnon: string;
    createdAt: string;
    };

    type TrustedContact = {
    id: string;
    anonLabel: string;
    since: string;
    };

    export default function Trust() {
    // UI-only mock data
    const [myInviteCode] = useState("7F3K-91QZ");
    const [inputCode, setInputCode] = useState("");

    const pending: PendingRequest[] = useMemo(
        () => [
        { id: "p1", fromAnon: "User #184203", createdAt: "2h ago" },
        { id: "p2", fromAnon: "User #552901", createdAt: "1d ago" },
        ],
        []
    );

    const contacts: TrustedContact[] = useMemo(
        () => [
        { id: "t1", anonLabel: "Trusted #A91F", since: "since 12d" },
        { id: "t2", anonLabel: "Trusted #C204", since: "since 3d" },
        ],
        []
    );

    const trustLevel = contacts.length >= 2 ? "TRUSTED" : "NEW";
    const postLimit = trustLevel === "TRUSTED" ? "8–10/day" : "3/day";

    const card =
        "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4";

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className={card}>
            <div className="flex items-start justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Trust
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                Build private connections using handshake codes. No profiles.
                </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-600/25 dark:border-green-500/30 bg-white/60 dark:bg-black/20 px-3 py-1 font-mono text-sm">
                <ShieldCheckIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                <span className="text-slate-800 dark:text-green-200">
                {trustLevel}
                </span>
                <span className="text-slate-600 dark:text-green-300/70">
                • limit {postLimit}
                </span>
            </div>
            </div>
        </div>

        {/* Your invite code */}
        <div className={card}>
            <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <KeyIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
                <div>
                <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
                    Your invite code
                </div>
                <div className="mt-1 font-mono text-lg text-slate-950 dark:text-green-100">
                    {myInviteCode}
                </div>
                <div className="text-xs text-slate-600 dark:text-green-300/70">
                    Share this privately. Anyone with this can request trust.
                </div>
                </div>
            </div>

            <button
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm
                border border-emerald-500/25 dark:border-green-500/25
                bg-emerald-500/10 dark:bg-green-500/10
                text-slate-800 dark:text-green-200
                hover:bg-emerald-500/15 dark:hover:bg-green-500/15
                ${focusRing}`}
                onClick={() => navigator.clipboard?.writeText(myInviteCode)}
            >
                <ClipboardDocumentIcon className="h-5 w-5" />
                Copy
            </button>
            </div>
        </div>

        {/* Add by code */}
        <div className={card}>
            <div className="flex items-center gap-3 mb-3">
            <UserPlusIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
            <div>
                <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
                Add someone by code
                </div>
                <div className="text-xs text-slate-600 dark:text-green-300/70">
                Paste their code to send a trust request.
                </div>
            </div>
            </div>

            <div className="flex gap-3">
            <input
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className={`flex-1 rounded-xl border border-emerald-500/20 dark:border-green-500/20
                bg-white/60 dark:bg-black/40 px-3 py-2 font-mono
                text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-300/50
                ${focusRing}`}
            />
            <button
                disabled={!inputCode.trim()}
                className={`rounded-xl px-4 py-2 font-mono text-sm border
                ${
                    inputCode.trim()
                    ? "border-emerald-600/30 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                    : "border-emerald-500/15 dark:border-green-500/15 text-slate-400 dark:text-green-400/40 cursor-not-allowed"
                }
                ${focusRing}`}
            >
                Send
            </button>
            </div>
        </div>

        {/* Pending requests */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Pending requests
            </div>

            {pending.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-green-300/70">
                No pending requests.
            </div>
            ) : (
            <div className="space-y-3">
                {pending.map((p) => (
                <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-emerald-500/15 dark:border-green-500/20 bg-white/50 dark:bg-black/35 px-3 py-2"
                >
                    <div>
                    <div className="font-mono text-sm text-slate-900 dark:text-green-200">
                        {p.fromAnon}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-green-300/70">
                        requested {p.createdAt}
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
                ))}
            </div>
            )}
        </div>

        {/* Trusted contacts */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Trusted contacts
            </div>

            {contacts.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-green-300/70">
                No trusted contacts yet. Use handshake codes to add someone.
            </div>
            ) : (
            <div className="space-y-2">
                {contacts.map((c) => (
                <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-emerald-500/15 dark:border-green-500/20 bg-white/50 dark:bg-black/35 px-3 py-2"
                >
                    <div className="font-mono text-sm text-slate-900 dark:text-green-200">
                    {c.anonLabel}
                    </div>
                    <div className="font-mono text-xs text-slate-600 dark:text-green-300/70">
                    {c.since}
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>

        {/* Trust ladder (explainer) */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-2">
            Trust ladder
            </div>
            <ul className="text-sm text-slate-700 dark:text-green-300/70 space-y-1">
            <li>
                <span className="font-mono text-slate-900 dark:text-green-200">NEW</span>{" "}
                • post limit: <span className="font-mono">3/day</span> • limited DMs
            </li>
            <li>
                <span className="font-mono text-slate-900 dark:text-green-200">TRUSTED</span>{" "}
                • post limit: <span className="font-mono">8–10/day</span> • more DM access
            </li>
            <li>
                Trust is private: no public profiles, no searchable identity.
            </li>
            </ul>
        </div>
        </div>
    );
}
