import { getWsTicket } from "./wsApi";

function getWsBaseUrl() {
  // Convert http://localhost:8080 -> ws://localhost:8080
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
    return apiBase.replace(/^http/, "ws");
}

export async function connectChatWS(peerKey: string) {
    const { ticket } = await getWsTicket(peerKey);

    const wsUrl = `${getWsBaseUrl()}/ws/chat?ticket=${encodeURIComponent(ticket)}`;
    const ws = new WebSocket(wsUrl);

    return ws;
}
