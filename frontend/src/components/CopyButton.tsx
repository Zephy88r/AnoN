import { useEffect, useRef, useState } from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

interface CopyButtonProps {
  /** Preferred prop (new) */
    value?: string;

  /** Legacy prop (old pages) */
    text?: string;

    disabled?: boolean;
    size?: "sm" | "md";
}

export default function CopyButton({
    value,
    text,
    disabled = false,
    size = "md",
    }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<number | null>(null);

    // 🔑 Resolve actual text to copy
    const copyValue = value ?? text ?? "";

    useEffect(() => {
        return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, []);

    const handleCopy = async () => {
        if (disabled || !copyValue) return;

        try {
        await navigator.clipboard.writeText(copyValue);
        setCopied(true);

        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            setCopied(false);
        }, 1000);
        } catch {
        // silent fail (toast later if needed)
        }
    };

    const padding = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";

    return (
        <button
        type="button"
        disabled={disabled || !copyValue}
        onClick={handleCopy}
        className={`inline-flex items-center gap-2 rounded-xl font-mono border
            ${padding}
            ${
            disabled || !copyValue
                ? "border-emerald-500/10 dark:border-green-500/10 text-slate-400 dark:text-green-400/40 cursor-not-allowed"
                : "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-slate-800 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
            }
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600
            dark:focus-visible:ring-green-400`}
        >
        <ClipboardDocumentIcon className="h-4 w-4" />
        {copied ? "Copied" : "Copy"}
        </button>
    );
}
