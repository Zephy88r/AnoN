import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import CopyButton from "../components/CopyButton";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

export default function Trust() {
  const trustCode = "TRUST-9X2K-A71Q"; // mock for now

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4">
        {/* Header */}
        <div className={`${card} p-4`}>
            <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-6 w-6 text-emerald-700 dark:text-green-300" />
            <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Trust
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                Exchange codes to unlock private communication.
                </p>
            </div>
            </div>
        </div>

        {/* Trust Code */}
        <div className={`${card} p-4 space-y-3`}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
            Your Trust Code
            </div>

            <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-lg text-slate-950 dark:text-green-100">
                {trustCode}
            </div>

            <CopyButton value={trustCode} />
            </div>

            <div className="text-xs text-slate-600 dark:text-green-300/70">
            Share this code privately. Trust is mutual and irreversible.
            </div>
        </div>
        </div>
    );
}
