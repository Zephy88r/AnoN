import { apiFetch } from "./api";

export type WsTicketResponse = {
    ticket: string;
    expires_in: number;
};

export async function getWsTicket(peer: string) {
    return apiFetch<WsTicketResponse>("/ws/ticket", {
        method: "POST",
        body: JSON.stringify({ peer }),
    });
}
