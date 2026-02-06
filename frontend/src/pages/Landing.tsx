import { useNavigate } from "react-router-dom";
import bg from "../assets/front-background.png";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div
        className="min-h-screen flex items-center justify-center text-green-100"
        style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
        }}
        >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/80 mix-blend-multiply"></div>


        {/* Content */}
        <div className="relative w-full max-w-xl border border-green-500/20 rounded-2xl p-8 bg-black/70 backdrop-blur">
            <h1 className="font-mono text-3xl text-green-400">G-host</h1>

            <p className="mt-2 text-green-300/80">
            Anonymous network console. No identity. No profiles.
            </p>

            <button
            onClick={() => navigate("/app/feed")}
            className="mt-6 w-full rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 px-4 py-3 font-mono text-green-200 transition"
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
