    import React, { useEffect, useMemo, useRef, useState } from "react";
    import { XMarkIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

    type TrustRequestModalProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (message?: string) => void;
    targetLabel?: string;
    maxChars?: number;
    };

    export default function TrustRequestModal({
    open,
    onClose,
    onSubmit,
    targetLabel,
    maxChars = 200,
    }: TrustRequestModalProps) {
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const remaining = useMemo(() => maxChars - message.length, [maxChars, message.length]);
    const overLimit = remaining < 0;

    useEffect(() => {
        if (!open) {
        setMessage("");
        setIsSubmitting(false);
        }
    }, [open]);

    useEffect(() => {
        if (open) {
        const t = window.setTimeout(() => textareaRef.current?.focus(), 50);
        return () => window.clearTimeout(t);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const handleOverlayMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleSubmit = async () => {
        if (isSubmitting || overLimit) return;

        setIsSubmitting(true);
        await new Promise((r) => setTimeout(r, 650));

        const trimmed = message.trim();
        onSubmit(trimmed.length ? trimmed : undefined);

        setIsSubmitting(false);
        onClose();
    };

    if (!open) return null;

    return (
        <div
        className="
            fixed inset-0 z-50 flex items-center justify-center
            bg-black/60 dark:bg-black/70
            backdrop-blur-sm
            px-3
        "
        onMouseDown={handleOverlayMouseDown}
        aria-modal="true"
        role="dialog"
        >
        <div
            className="
            w-full max-w-xl rounded-2xl border
            border-green-600/25 dark:border-green-500/30
            bg-white dark:bg-zinc-950
            shadow-[0_0_24px_rgba(34,197,94,0.12)]
            "
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-green-600/10 dark:border-green-500/15 px-5 py-4">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-green-600/15 dark:border-green-500/20 bg-green-600/5 dark:bg-green-500/5 p-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-700 dark:text-green-400" />
                </div>

                <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-green-200">
                    Request Trust
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    This requests a private channel if accepted.
                    {targetLabel ? (
                    <>
                        {" "}
                        <span className="text-zinc-700 dark:text-zinc-300">Target:</span>{" "}
                        <span className="text-green-700 dark:text-green-300">{targetLabel}</span>
                    </>
                    ) : null}
                </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onClose}
                className="
                rounded-lg border
                border-green-600/15 dark:border-green-500/20
                bg-transparent p-2
                text-zinc-600 dark:text-zinc-300
                transition
                hover:border-green-600/35 dark:hover:border-green-500/40
                hover:text-zinc-900 dark:hover:text-green-200
                "
                aria-label="Close"
            >
                <XMarkIcon className="h-5 w-5" />
            </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
            {/* Explanation box */}
            <div className="rounded-xl border border-green-600/15 dark:border-green-500/20 bg-green-600/5 dark:bg-green-500/5 p-4">
                <p className="text-sm text-zinc-800 dark:text-zinc-300">
                Trust requests are <span className="text-green-700 dark:text-green-300">one-time</span>.
                If accepted, a private chat is unlocked.
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                If declined, nothing is revealed. No identities. No profiles. No retries.
                </p>
            </div>

            {/* Optional note */}
            <div className="mt-4">
                <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-300">
                    Optional note <span className="text-zinc-500">(max {maxChars})</span>
                </label>

                <span
                    className={[
                    "text-xs",
                    overLimit
                        ? "text-red-500"
                        : remaining <= 20
                        ? "text-amber-600 dark:text-yellow-300"
                        : "text-zinc-500",
                    ].join(" ")}
                >
                    {Math.min(message.length, maxChars)} / {maxChars}
                </span>
                </div>

                <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Why are you requesting trust?"
                className={[
                    "mt-2 w-full resize-none rounded-xl border px-3 py-3 text-sm outline-none",
                    "bg-white dark:bg-zinc-950",
                    "text-zinc-900 dark:text-zinc-200",
                    "placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                    overLimit
                    ? "border-red-500/40 focus:border-red-500/60"
                    : "border-green-600/15 dark:border-green-500/20 focus:border-green-600/40 dark:focus:border-green-500/45",
                ].join(" ")}
                />

                {overLimit ? (
                <p className="mt-2 text-xs text-red-500">
                    Too long. Remove {Math.abs(remaining)} character{Math.abs(remaining) === 1 ? "" : "s"}.
                </p>
                ) : null}
            </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-green-600/10 dark:border-green-500/15 px-5 py-4">
            <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="
                w-full sm:w-auto
                rounded-xl border
                border-green-600/15 dark:border-green-500/20
                bg-transparent px-4 py-2 text-sm font-medium
                text-zinc-700 dark:text-zinc-300
                transition
                hover:border-green-600/35 dark:hover:border-green-500/40
                hover:text-zinc-900 dark:hover:text-green-200
                disabled:opacity-60
                "
            >
                Cancel
            </button>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || overLimit}
                className={[
                "w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition border",
                "border-green-600/25 dark:border-green-500/30",
                isSubmitting || overLimit
                    ? "bg-green-600/10 dark:bg-green-500/10 text-green-900/40 dark:text-green-200/60"
                    : "bg-green-600/15 dark:bg-green-500/15 text-green-900 dark:text-green-200 hover:bg-green-600/25 dark:hover:bg-green-500/25",
                ].join(" ")}
            >
                {isSubmitting ? "Sending..." : "Send Trust Request"}
            </button>
            </div>
        </div>
        </div>
    );
    }
