import { apiFetch } from "./api";

export async function getWsTicket(peer: string) {
  return apiFetch<{ ticket: string; expires_in: number }>("/ws/ticket", {
    method: "POST",
    body: JSON.stringify({ peer }),
  });
}

export async function connectChatWS(peer: string) {
  const { ticket } = await getWsTicket(peer);
  const ws = new WebSocket(`ws://localhost:8080/ws/chat?ticket=${encodeURIComponent(ticket)}`);
  return ws;
}
