import { apiFetch } from "./api";

export type ApiLinkCard = {
    code: string;
    status: "active" | "used" | "revoked" | "expired";
    expires_at: string;
};

export async function createLinkCard() {
    return apiFetch<ApiLinkCard>("/link-cards/create", {
        method: "POST",
        body: JSON.stringify({}),
    });
}

export async function fetchMyLinkCards() {
    return apiFetch<ApiLinkCard[]>("/link-cards/mine");
}
