import { useState } from "react";
import { MapPinIcon, GlobeAltIcon } from "@heroicons/react/24/outline";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

export default function Map() {
    const [region] = useState("NEPAL • BAGMATI");

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-3 sm:px-0">
        {/* Header */}
        <div className={`${card} p-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
                <GlobeAltIcon className="w-6 h-6 text-emerald-600 dark:text-green-400" />
                <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                    Geo Map
                </h1>
                <p className="text-sm text-slate-700 dark:text-green-300/70">
                    {region}
                </p>
                </div>
            </div>
            </div>
        </div>

        {/* Stub content */}
        <div className={`${card} p-6 space-y-4`}>
            <div className="flex items-center gap-3">
            <MapPinIcon className="w-8 h-8 text-emerald-600 dark:text-green-400" />
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-green-100">
                Geo pings not implemented yet
                </h2>
                <p className="text-sm text-slate-600 dark:text-green-300/70 mt-1">
                This feature will allow you to send location pings to trusted peers.
                </p>
            </div>
            </div>

            <button
            type="button"
            disabled
            className={`${focusRing} rounded-xl px-4 py-2 border border-emerald-500/30 dark:border-green-500/30
                text-slate-400 dark:text-green-400/50 cursor-not-allowed`}
            >
            Send ping (TODO)
            </button>
        </div>
        </div>
    );
}