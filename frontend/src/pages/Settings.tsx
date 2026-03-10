import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { getAnonDeviceKey } from "../services/geo";
import { logout, getMyUsername, onSessionIdentityUpdated } from "../services/session";
import { getMyProfile, type ProfileMe } from "../services/profileApi";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4";

function formatDate(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

export default function Settings() {
    const { themeMode, setThemeMode, resolvedTheme } = useTheme();
    const navigate = useNavigate();

    // stable anon id (shortened for display)
    const anonId = getAnonDeviceKey()
        .replace("dev_", "")
        .slice(0, 8)
        .toUpperCase();
    
    const [username, setUsername] = useState(getMyUsername());
    const [profile, setProfile] = useState<ProfileMe | null>(null);

    useEffect(() => {
        return onSessionIdentityUpdated(() => {
            setUsername(getMyUsername());
        });
    }, []);

    useEffect(() => {
        let active = true;
        getMyProfile()
            .then((res) => {
                if (!active) return;
                setProfile(res);
            })
            .catch(() => {
                if (!active) return;
                setProfile(null);
            });

        return () => {
            active = false;
        };
    }, []);

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

        {/* ===============================
            Appearance
        =============================== */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Appearance
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Theme
            </span>
            <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                {resolvedTheme}
            </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
            <button
                type="button"
                onClick={() => setThemeMode("system")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    themeMode === "system"
                        ? "border-emerald-600 bg-emerald-600/10 text-emerald-800 dark:border-green-400 dark:bg-green-500/15 dark:text-green-100"
                        : "border-emerald-500/20 text-slate-700 hover:bg-emerald-500/10 dark:border-green-500/25 dark:text-green-200 dark:hover:bg-green-500/10"
                }`}
            >
                System
            </button>
            <button
                type="button"
                onClick={() => setThemeMode("light")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    themeMode === "light"
                        ? "border-emerald-600 bg-emerald-600/10 text-emerald-800 dark:border-green-400 dark:bg-green-500/15 dark:text-green-100"
                        : "border-emerald-500/20 text-slate-700 hover:bg-emerald-500/10 dark:border-green-500/25 dark:text-green-200 dark:hover:bg-green-500/10"
                }`}
            >
                Light
            </button>
            <button
                type="button"
                onClick={() => setThemeMode("dark")}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    themeMode === "dark"
                        ? "border-emerald-600 bg-emerald-600/10 text-emerald-800 dark:border-green-400 dark:bg-green-500/15 dark:text-green-100"
                        : "border-emerald-500/20 text-slate-700 hover:bg-emerald-500/10 dark:border-green-500/25 dark:text-green-200 dark:hover:bg-green-500/10"
                }`}
            >
                Dark
            </button>
            </div>

            <div className="mt-2 text-xs text-slate-600 dark:text-green-300/70">
            Theme follows system preference unless changed.
            </div>
        </div>

        {/* ===============================
            Privacy
        =============================== */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Privacy
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Ghost Mode
            </span>
            <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                Planned
            </span>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
            Ghost mode controls are reserved for the future map rollout.
            </div>

            <div className="mt-4 flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Region Visibility
            </span>
            <span className="font-mono text-sm text-slate-600 dark:text-green-300/70">
                Planned
            </span>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
            Region visibility controls will be enabled once map features are live.
            </div>
        </div>

        {/* ===============================
            Security / Device
        =============================== */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Security / Device
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
                <div className="text-slate-600 dark:text-green-300/70">Primary Device Active</div>
                <div className="font-mono text-slate-900 dark:text-green-200">{profile ? (profile.primary_device_active ? "Yes" : "No") : "-"}</div>
            </div>
            <div>
                <div className="text-slate-600 dark:text-green-300/70">Session Status</div>
                <div className="font-mono text-slate-900 dark:text-green-200">{profile?.session_status || "-"}</div>
            </div>
            <div>
                <div className="text-slate-600 dark:text-green-300/70">Last Active</div>
                <div className="font-mono text-slate-900 dark:text-green-200">{formatDate(profile?.last_active_at)}</div>
            </div>
            <div>
                <div className="text-slate-600 dark:text-green-300/70">Recovery Key Generated</div>
                <div className="font-mono text-slate-900 dark:text-green-200">{profile ? (profile.recovery_key_generated ? "Yes" : "No") : "-"}</div>
            </div>
            </div>
        </div>

        {/* ===============================
            Identity
        =============================== */}
        <div className={card}>
            <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
            Identity
            </div>

            <div className="flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Username
            </span>
            <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                {username || "Not set"}
            </span>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
            Your display name shown in posts and comments.
            </div>

            <div className="mt-4 flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Device ID
            </span>
            <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                {anonId}
            </span>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
            This ID is device-bound and cannot be changed.
            </div>

            <div className="mt-4 flex items-center justify-between">
            <span className="text-slate-800 dark:text-green-200">
                Username Changed
            </span>
            <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                {formatDate(profile?.username_changed_at)}
            </span>
            </div>

            <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
            Last time your username was updated.
            </div>

            <div className="mt-6">
            <button
                onClick={() => {
                logout();
                navigate("/");
                }}
                className="w-full  gap-3 px-3 py-2.5 rounded-xl text-lm font-medium
                        text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10
                        border border-red-500/20 dark:border-red-500/20 transition-colors"
            >
                Logout
            </button>
            </div>
        </div>
        </div>
    );
}
