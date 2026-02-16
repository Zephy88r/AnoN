import { useEffect, useState } from "react";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type ConfirmationModalProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
};

export default function ConfirmationModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false,
}: ConfirmationModalProps) {
    const [mounted, setMounted] = useState(false);
    const [enter, setEnter] = useState(false);
    const [loading, setLoading] = useState(false);

    // Mount/unmount with exit animation
    useEffect(() => {
        if (open) {
            setMounted(true);
            const t = window.setTimeout(() => setEnter(true), 10);
            return () => window.clearTimeout(t);
        } else {
            setEnter(false);
            const t = window.setTimeout(() => setMounted(false), 180);
            return () => window.clearTimeout(t);
        }
    }, [open]);

    // ESC to close
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    // Lock body scroll while open
    useEffect(() => {
        if (!open) return;

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const handleOverlayMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div
            onMouseDown={handleOverlayMouseDown}
            className={`
                fixed inset-0 z-50 flex items-center justify-center
                bg-black/40 dark:bg-black/60 backdrop-blur-sm
                transition-opacity duration-150
                ${enter ? "opacity-100" : "opacity-0"}
            `}
        >
            <div
                className={`
                    relative w-full max-w-md mx-4
                    rounded-2xl border border-emerald-500/20 dark:border-green-500/30
                    bg-white/95 dark:bg-black/90 backdrop-blur-xl
                    shadow-2xl shadow-emerald-500/10 dark:shadow-green-500/20
                    transition-all duration-150
                    ${enter ? "scale-100 opacity-100" : "scale-95 opacity-0"}
                `}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className={`
                            rounded-full p-2
                            ${danger 
                                ? "bg-red-500/10 dark:bg-red-500/20" 
                                : "bg-emerald-500/10 dark:bg-green-500/20"
                            }
                        `}>
                            <ExclamationTriangleIcon 
                                className={`h-6 w-6 ${
                                    danger 
                                        ? "text-red-600 dark:text-red-400" 
                                        : "text-emerald-600 dark:text-green-400"
                                }`}
                            />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-950 dark:text-green-100">
                            {title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:text-green-400/70 dark:hover:text-green-300 hover:bg-slate-100 dark:hover:bg-green-500/10 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 pb-6">
                    <p className="text-slate-700 dark:text-green-300/80 leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-green-300/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl px-4 py-2 text-sm font-mono
                            border border-slate-300 dark:border-green-500/30
                            bg-white dark:bg-black/50
                            text-slate-700 dark:text-green-300
                            hover:bg-slate-50 dark:hover:bg-green-500/10
                            disabled:opacity-75 disabled:cursor-not-allowed
                            transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`
                            rounded-xl px-4 py-2 text-sm font-mono
                            border transition-colors
                            ${loading ? "opacity-75 cursor-not-allowed" : ""}
                            ${danger
                                ? "border-red-400/40 dark:border-red-500/40 bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/20 dark:hover:bg-red-500/30 disabled:hover:bg-red-500/10 dark:disabled:hover:bg-red-500/20"
                                : "border-emerald-500/40 dark:border-green-500/40 bg-emerald-500/10 dark:bg-green-500/20 text-emerald-800 dark:text-green-300 hover:bg-emerald-500/20 dark:hover:bg-green-500/30 disabled:hover:bg-emerald-500/10 dark:disabled:hover:bg-green-500/20"
                            }
                        `}
                    >
                        {loading && <span className="mr-2">⏳</span>}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
