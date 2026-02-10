import { apiFetch } from "./api";
import { setSessionToken } from "./api";

type BootstrapResponse = {
    token: string;
};

export async function bootstrapSession(): Promise<void> {
    const res = await apiFetch<BootstrapResponse>(
        "/session/bootstrap",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            device_key: "web",
            region: "Koshi",
        }),
        },
        { auth: false } // ✅ THIS IS THE FIX
    );

    setSessionToken(res.token);
}
