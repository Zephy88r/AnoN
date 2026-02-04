import { useMemo, useState } from "react";
import { LinkIcon } from "@heroicons/react/24/outline";
import LinkCardTile from "../components/LinkCardTile";
import type { LinkStatus } from "../components/LinkCardTile";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

type LinkCardItem = {
    id: string;
    fromMe: boolean;
    code: string;
    expiresIn: string;
    note?: string;
    time: string;
    status: LinkStatus;
    meta?: string;
};

export default function LinkCards() {
    const initial = useMemo<LinkCardItem[]>(
        () => [
        {
            id: "lc1",
            fromMe: true,
            code: "X9K2-4P7Q",
            expiresIn: "24h",
            note: "Device bridge",
            time: "today",
            status: "active",
        },
        {
            id: "lc2",
            fromMe: true,
            code: "R7T1-0K9C",
            expiresIn: "24h",
            note: "Old card",
            time: "yesterday",
            status: "revoked",
            meta: "revoked by you",
        },
        {
            id: "lc3",
            fromMe: false,
            code: "M1Q0-8Z2A",
            expiresIn: "6h",
            note: "Received card",
            time: "today",
            status: "used",
            meta: "used 2m ago",
        },
        ],
        []
    );

    const [cards, setCards] = useState<LinkCardItem[]>(initial);

    const revoke = (id: string) => {
        setCards((prev) =>
        prev.map((c) =>
            c.id === id && c.fromMe && c.status === "active"
            ? { ...c, status: "revoked", meta: "revoked just now" }
            : c
        )
        );
    };

    return (
        <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* Header */}
        <div className={`${card} p-4 flex items-center justify-between`}>
            <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Link Cards
            </h1>
            <p className="text-sm text-slate-700 dark:text-green-300/70">
                Temporary contact bridges. No profiles. No leaks.
            </p>
            </div>

            <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm
                border border-emerald-500/25 dark:border-green-500/25
                bg-emerald-500/10 dark:bg-green-500/10
                text-slate-800 dark:text-green-200
                hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
            >
            <LinkIcon className="h-5 w-5" />
            Generate
            </button>
        </div>

        {/* List */}
        <div className="space-y-3">
            {cards.map((c) => (
            <LinkCardTile
                key={c.id}
                fromMe={c.fromMe}
                code={c.code}
                expiresIn={c.expiresIn}
                note={c.note}
                time={c.time}
                status={c.status}
                meta={c.meta}
                onRevoke={c.fromMe && c.status === "active" ? () => revoke(c.id) : undefined}
            />
            ))}
        </div>
        </div>
    );
}
