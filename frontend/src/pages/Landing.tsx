import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/front-background.png";
import { bootstrapSession } from "../services/session";
import { ApiError } from "../services/api";

type BanErrorPayload = {
    code?: string;
    details?: {
        is_permanent?: boolean;
        ban_expires_at?: string;
        remaining_seconds?: number;
        ban_label?: string;
    };
};

function formatRemainingBanTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
    return parts.join(" ");
}

export default function Landing() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [banPopupMessage, setBanPopupMessage] = useState<string | null>(null);

    const handleEnter = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await bootstrapSession();
            navigate("/app/feed");
        } catch (error) {
            console.error("[Landing] Bootstrap failed:", error);
            if (error instanceof ApiError && error.status === 403) {
                const payload = error.data as BanErrorPayload;
                if (payload?.code === "USER_BANNED") {
                    if (payload.details?.is_permanent) {
                        setBanPopupMessage("You are banned permanently.");
                        return;
                    }

                    const remainingSeconds = payload.details?.remaining_seconds;
                    if (typeof remainingSeconds === "number") {
                        setBanPopupMessage(`You are banned for ${formatRemainingBanTime(remainingSeconds)}.`);
                        return;
                    }

                    if (payload.details?.ban_expires_at) {
                        const until = new Date(payload.details.ban_expires_at);
                        if (!Number.isNaN(until.getTime())) {
                            setBanPopupMessage(`You are banned until ${until.toLocaleString()}.`);
                            return;
                        }
                    }

                    setBanPopupMessage(payload.details?.ban_label || "You are currently banned.");
                    return;
                }
            }
        } finally {
            setLoading(false);
        }
    };

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
            onClick={handleEnter}
            disabled={loading}
            className="mt-6 w-full rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 px-4 py-3 font-mono text-green-200 transition disabled:opacity-60"
            >
            {loading ? "Linking…" : "Enter Network →"}
            </button>

            <p className="mt-4 text-xs text-green-300/60 font-mono">
            Tip: Ghost mode is ON by default.
            </p>
        </div>

        {banPopupMessage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-black/90 p-6 shadow-2xl">
                    <h2 className="text-lg font-semibold text-red-300">Access denied</h2>
                    <p className="mt-3 text-sm text-red-100">{banPopupMessage}</p>
                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setBanPopupMessage(null)}
                            className="rounded-xl border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 text-sm font-mono text-red-200"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}
