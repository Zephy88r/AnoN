export default function HomeFeed() {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
                Feed
            </h1>
            <p className="text-sm text-slate-700 dark:text-green-300/70">
                Anonymous network feed
            </p>
            </div>

            <div className="rounded-full border border-emerald-600/30 dark:border-green-500/30 bg-white/60 dark:bg-black/20 px-3 py-1 text-sm font-mono text-emerald-800 dark:text-green-300">
            3 posts left
            </div>
        </div>
        </div>

                {/* Post Composer */}
        <div className="rounded-2xl border border-emerald-500/20 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4 space-y-3">
            <textarea
            disabled
            placeholder="What’s on your mind?"
            className="w-full resize-none rounded-xl bg-transparent p-3 text-slate-900 dark:text-green-100 placeholder:text-slate-500 dark:placeholder:text-green-300/50 outline-none"
            rows={3}
            />

            <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-600 dark:text-green-300/70">
                posts left today: 3
            </span>

            <button
                disabled
                className="rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/30 dark:border-green-500/30
                text-slate-500 dark:text-green-400/50 cursor-not-allowed"
            >
                Post
            </button>
            </div>
        </div>

        {/* Post Card */}
        <div className="space-y-4">
            {[1, 2, 3].map((id) => (
            <div
                key={id}
                className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/60 dark:bg-black/50 backdrop-blur p-4"
            >
                <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                    User #{483920 + id}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                    {id * 2}m ago
                </span>
                </div>

                <p className="text-slate-800 dark:text-green-100 leading-relaxed">
                This is a sample anonymous post. No identity, no profile, just
                thoughts shared freely on the network.
                </p>

                <div className="mt-3 flex gap-4 text-xs font-mono text-slate-600 dark:text-green-300/70">
                <button className="hover:text-emerald-700 dark:hover:text-green-200">
                    reply
                </button>
                <button className="hover:text-emerald-700 dark:hover:text-green-200">
                    trust
                </button>
                </div>
            </div>
            ))}
        </div>

        </div>
    );
}

