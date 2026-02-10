import { apiFetch } from "./api";

export async function createWsTicket(peerAnonId: string) {
    return apiFetch<{ ticket: string; expires_in: number }>("/ws/ticket", {
        method: "POST",
        body: JSON.stringify({ peer: peerAnonId }),
    });
}

export function connectChatWS(ticket: string) {
    const url = `ws://localhost:8080/ws/chat?ticket=${encodeURIComponent(ticket)}`;
    return new WebSocket(url);
}
