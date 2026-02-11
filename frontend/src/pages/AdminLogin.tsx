import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import { getAdminToken, loginAdmin, setAdminToken } from "../services/adminApi";

const card =
    "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-6";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (getAdminToken()) {
            navigate("/admin/panel", { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const response = await loginAdmin(email.trim(), password);
            setAdminToken(response.token);
            navigate("/admin/panel", { replace: true });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Login failed";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminShell variant="login">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold text-green-100">Admin Access</h1>
                    <p className="text-sm text-green-300/70">
                        Sign in to manage moderation, system health, and audits.
                    </p>
                </div>

                <div className={card}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <label className="block">
                            <span className="text-xs font-mono text-green-300/70">Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="papa@gmail.com"
                                className="mt-2 w-full rounded-xl bg-white/10 border border-emerald-500/25 px-3 py-2 text-sm text-green-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                autoComplete="username"
                                required
                            />
                        </label>

                        <label className="block">
                            <span className="text-xs font-mono text-green-300/70">Password</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="papa@"
                                className="mt-2 w-full rounded-xl bg-white/10 border border-emerald-500/25 px-3 py-2 text-sm text-green-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                autoComplete="current-password"
                                required
                            />
                        </label>

                        {error && (
                            <div className="text-sm text-red-400 font-mono">{error}</div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-xl px-4 py-2 text-sm font-mono border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                </div>

                <div className="text-xs text-green-400/70 font-mono">
                    This panel is protected. Credentials are required.
                </div>
            </div>
        </AdminShell>
    );
}
