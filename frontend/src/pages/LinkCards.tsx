import { useMemo, useState } from "react";
import {
    PlusIcon,
    LinkIcon,
    TrashIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";

import CopyButton from "../components/CopyButton";

type LinkStatus = "active" | "used" | "revoked" | "expired";

type LinkCard = {
    id: string;
    code: string;
    createdAtISO: string;
    expiresAtISO: string;
    status: LinkStatus;
    note?: string;
    usedAtISO?: string;
    revokedAtISO?: string;
};

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

function makeId() {
    return `lc_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function randCode() {
    const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${part()}-${part()}`;
}

function fmtAge(iso: string) {
    const ms = Date.now() - Date.parse(iso);
    const m = Math.max(1, Math.round(ms / 60000));
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
}

function fmtUntil(iso: string) {
    const ms = Date.parse(iso) - Date.now();
    const m = Math.round(ms / 60000);
    if (m <= 0) return "expired";
    if (m < 60) return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.round(h / 24);
    return `${d}d`;
}

function statusPill(status: LinkStatus) {
    switch (status) {
        case "active":
        return {
            label: "Active",
            cls: "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-200",
            Icon: LinkIcon,
        };
        case "used":
        return {
            label: "Used",
            cls: "border-slate-300 dark:border-green-500/15 bg-white/40 dark:bg-black/20 text-slate-700 dark:text-green-200/70",
            Icon: CheckCircleIcon,
        };
        case "revoked":
        return {
            label: "Revoked",
            cls: "border-slate-300 dark:border-green-500/15 bg-white/40 dark:bg-black/20 text-slate-700 dark:text-green-200/70",
            Icon: XCircleIcon,
        };
        case "expired":
        return {
            label: "Expired",
            cls: "border-slate-300 dark:border-green-500/15 bg-white/40 dark:bg-black/20 text-slate-700 dark:text-green-200/70",
            Icon: ClockIcon,
        };
    }
}

export default function LinkCards() {
    const initial: LinkCard[] = useMemo(() => {
        const now = Date.now();

        const mk = (partial: Partial<LinkCard> & Pick<LinkCard, "status" | "code">): LinkCard => {
        const createdAtISO = new Date(now - 1000 * 60 * 60).toISOString();
        const expiresAtISO = new Date(now + 1000 * 60 * 60 * 24).toISOString();

        return {
            id: makeId(),
            createdAtISO,
            expiresAtISO,
            note: partial.note,
            usedAtISO: partial.usedAtISO,
            revokedAtISO: partial.revokedAtISO,
            ...partial,
        };
        };

        return [
        mk({ status: "active", code: "X9K2-4P7Q", note: "Use this to reach me on a new device." }),
        mk({
            status: "used",
            code: "M1Q0-8Z2A",
            note: "Backup contact bridge.",
            usedAtISO: new Date(now - 1000 * 60 * 2).toISOString(),
        }),
        mk({
            status: "revoked",
            code: "R7T1-0K9C",
            note: "Old card (revoked).",
            revokedAtISO: new Date(now - 1000 * 60 * 30).toISOString(),
        }),
        mk({
            status: "expired",
            code: "Q2W8-6H1P",
            note: "Expired demo.",
            expiresAtISO: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
        }),
        ];
    }, []);

    const [cards, setCards] = useState<LinkCard[]>(initial);
    const [note, setNote] = useState("");
    const [filter, setFilter] = useState<LinkStatus | "all">("all");

    // UI-only: update expirations on render (so active becomes expired if time passes)
    const normalized = useMemo(() => {
        const now = Date.now();
        return cards.map((c) => {
        if (c.status === "active" && Date.parse(c.expiresAtISO) <= now) {
            return { ...c, status: "expired" as const };
        }
        return c;
        });
    }, [cards]);

    const visible = useMemo(() => {
        const base = filter === "all" ? normalized : normalized.filter((c) => c.status === filter);
        // newest first
        return [...base].sort((a, b) => Date.parse(b.createdAtISO) - Date.parse(a.createdAtISO));
    }, [normalized, filter]);

    const activeCount = useMemo(
        () => normalized.filter((c) => c.status === "active").length,
        [normalized]
    );

    const generate = () => {
        // UI-only rule: allow max 3 active cards
        if (activeCount >= 3) return;

        const now = Date.now();
        const newCard: LinkCard = {
        id: makeId(),
        code: randCode(),
        createdAtISO: new Date(now).toISOString(),
        expiresAtISO: new Date(now + 1000 * 60 * 60 * 24).toISOString(), // 24h
        status: "active",
        note: note.trim() || undefined,
        };

        setCards((prev) => [newCard, ...prev]);
        setNote("");
    };

    const revoke = (id: string) => {
        setCards((prev) =>
        prev.map((c) =>
            c.id === id && c.status === "active"
            ? { ...c, status: "revoked", revokedAtISO: new Date().toISOString() }
            : c
        )
        );
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-4 px-3 sm:px-0">
        {/* Header */}
        <div className={`${card} p-4`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Link Cards
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                One-time secure bridges. Generate, copy, revoke.
                </p>
            </div>

            <div className="w-fit rounded-full border border-emerald-600/30 dark:border-green-500/30 bg-white/60 dark:bg-black/20 px-3 py-1 text-sm font-mono text-emerald-800 dark:text-green-300">
                active: {activeCount} / 3
            </div>
            </div>

            {/* Generator */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (shown with the card)…"
                className={`w-full rounded-xl border border-emerald-500/20 dark:border-green-500/20 bg-white/60 dark:bg-black/40 px-3 py-2 text-sm
                text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-300/50 ${focusRing}`}
            />

            <button
                type="button"
                onClick={generate}
                disabled={activeCount >= 3}
                className={[
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-mono border transition",
                "border-emerald-500/25 dark:border-green-500/25",
                activeCount >= 3
                    ? "bg-emerald-500/5 dark:bg-green-500/5 text-slate-400 dark:text-green-400/40 cursor-not-allowed"
                    : "bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15",
                focusRing,
                ].join(" ")}
                title={activeCount >= 3 ? "Limit reached (UI-only)" : "Generate Link Card"}
            >
                <PlusIcon className="h-5 w-5" />
                Generate
            </button>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "active", "used", "revoked", "expired"] as const).map((k) => {
                const on = filter === k;
                return (
                <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={[
                    "rounded-full px-3 py-1 text-xs font-mono border transition",
                    on
                        ? "border-emerald-500/30 dark:border-green-500/30 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200"
                        : "border-emerald-500/15 dark:border-green-500/15 bg-white/40 dark:bg-black/20 text-slate-700 dark:text-green-300/70 hover:bg-emerald-500/5 dark:hover:bg-green-500/5",
                    ].join(" ")}
                >
                    {k}
                </button>
                );
            })}
            </div>
        </div>

        {/* List */}
        <div className="space-y-3">
            {visible.map((c) => {
            const pill = statusPill(c.status);
            const Icon = pill.Icon;

            const expiresIn = fmtUntil(c.expiresAtISO);

            const meta =
                c.status === "used"
                ? c.usedAtISO
                    ? `used ${fmtAge(c.usedAtISO)}`
                    : "used"
                : c.status === "revoked"
                ? c.revokedAtISO
                    ? `revoked ${fmtAge(c.revokedAtISO)}`
                    : "revoked"
                : c.status === "expired"
                ? "expired"
                : `expires in ${expiresIn}`;

            return (
                <div key={c.id} className={`${card} p-4`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="font-mono text-sm text-slate-900 dark:text-green-200">
                        {c.code}
                        </div>

                        <div
                        className={[
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono border",
                            pill.cls,
                        ].join(" ")}
                        >
                        <Icon className="h-4 w-4" />
                        {pill.label}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-green-300/60 font-mono">
                        {meta}
                        </div>
                    </div>

                    {c.note ? (
                        <div className="mt-2 text-sm text-slate-700 dark:text-green-200/80">
                        {c.note}
                        </div>
                    ) : (
                        <div className="mt-2 text-sm text-slate-500 dark:text-green-300/40">
                        no note
                        </div>
                    )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                    <CopyButton text={c.code} />

                    <button
                        type="button"
                        onClick={() => revoke(c.id)}
                        disabled={c.status !== "active"}
                        className={[
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-mono border transition",
                        c.status === "active"
                            ? "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-slate-900 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                            : "border-slate-300 dark:border-green-500/15 text-slate-400 dark:text-green-400/40 cursor-not-allowed",
                        focusRing,
                        ].join(" ")}
                        title={c.status === "active" ? "Revoke link card" : "Only active cards can be revoked"}
                    >
                        <TrashIcon className="h-4 w-4" />
                        Revoke
                    </button>
                    </div>
                </div>
                </div>
            );
            })}

            {visible.length === 0 && (
            <div className={`${card} p-6`}>
                <div className="text-slate-900 dark:text-green-200 font-semibold">
                No link cards
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-green-300/70">
                Generate one above to create a one-time bridge.
                </div>
            </div>
            )}
        </div>
        </div>
    );
}
