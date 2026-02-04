import { useNavigate } from "react-router-dom";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-green-100 flex items-center justify-center">
        <div className="w-full max-w-xl border border-green-500/20 rounded-2xl p-8 bg-black/70">
            <h1 className="font-mono text-3xl text-green-400">G-host</h1>
            <p className="mt-2 text-green-300/80">
            Anonymous network console. No identity. No profiles.
            </p>

            <button
            onClick={() => navigate("/app/feed")}
            className="mt-6 w-full rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 px-4 py-3 font-mono text-green-200"
            >
            Enter Network →
            </button>

            <p className="mt-4 text-xs text-green-300/60 font-mono">
            Tip: Ghost mode is ON by default.
            </p>
        </div>
        </div>
    );
}
