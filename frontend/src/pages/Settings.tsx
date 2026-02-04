export default function Settings() {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
            Settings
            </h1>
            <p className="text-sm text-slate-700 dark:text-green-300/70">
            Control your presence on the network
            </p>
        </div>

      {/* Appearance */}
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4 space-y-3">
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
            Appearance
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Theme
            </span>
            <span className="font-mono text-sm text-slate-600 dark:text-green-300/70">
                System
            </span>
            </div>
        </div>

      {/* Privacy */}
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4 space-y-4">
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
            Privacy
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Ghost Mode
            </span>
            <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                ON
            </span>
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Region Visibility
            </span>
            <span className="font-mono text-sm text-slate-600 dark:text-green-300/70">
                Manual
            </span>
            </div>
        </div>

      {/* Identity */}
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4 space-y-4">
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
            Identity
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Anonymous ID
            </span>
            <span className="font-mono text-sm text-slate-600 dark:text-green-300/70">
                User #XXXXXX
            </span>
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Recovery Keys
            </span>
            <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                Generated
            </span>
            </div>
        </div>
    </div>
    );
}
