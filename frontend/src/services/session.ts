import { apiFetch, setSessionToken } from "./api";

type BootstrapResp = { token: string };

export async function bootstrapSession(): Promise<string> {
    const res = await apiFetch<BootstrapResp>(
        "/session/bootstrap",
        {
        method: "POST",
        body: JSON.stringify({ device_key: "web", region: "Koshi" }),
        },
        { auth: false } // ✅ critical
    );

    setSessionToken(res.token);
    return res.token;
}
