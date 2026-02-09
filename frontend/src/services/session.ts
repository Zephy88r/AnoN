import { apiFetch, setSessionToken } from "./api";
import { getAnonDeviceKey } from "./geo"; // ✅ correct import

type BootstrapResponse = {
    token: string;
    anon_id?: string;
};

export async function bootstrapSession(region?: string) {
    const device_key = getAnonDeviceKey();

    const resp = await apiFetch<BootstrapResponse>("/session/bootstrap", {
    method: "POST",
    body: JSON.stringify({ device_key, region }),
    });

    setSessionToken(resp.token);
    return resp;
}
