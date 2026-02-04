export default function UtilityPanel() {
    return (
        <aside className="border-l border-green-500/20 bg-black/70 p-4 space-y-4">
        <div className="rounded-xl border border-green-500/20 p-3">
            <div className="font-mono text-green-400 text-sm mb-1">Network</div>
            <div className="text-green-300 text-sm">Region: NEPAL</div>
            <div className="text-green-300 text-sm">Mode: Ghost</div>
        </div>

        <div className="rounded-xl border border-green-500/20 p-3">
            <div className="font-mono text-green-400 text-sm mb-1">Trust</div>
            <div className="text-green-300 text-sm">Level: NEW</div>
            <div className="text-green-300 text-sm">Contacts: 0</div>
        </div>

        <div className="rounded-xl border border-green-500/20 p-3">
            <div className="font-mono text-green-400 text-sm mb-1">Limits</div>
            <div className="text-green-300 text-sm">Posts left: 3</div>
            <div className="text-green-300 text-sm">DMs: Restricted</div>
        </div>
        </aside>
    );
}
