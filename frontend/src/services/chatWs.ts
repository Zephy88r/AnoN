import { apiFetch } from "./api";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8080";

export async function getWsTicket(peer: string) {
  return apiFetch<{ ticket: string; expires_in: number }>("/ws/ticket", {
    method: "POST",
    body: JSON.stringify({ peer }),
  });
}

/**
 * ✅ Connect to chat WebSocket with automatic ticket retry.
 * If ticket expires (401), re-request ticket once and reconnect.
 */
export async function connectChatWS(
  peer: string, 
  handlers: {
    onOpen?: () => void;
    onMessage?: (data: unknown) => void;
    onClose?: () => void;
    onError?: (err: Event) => void;
  }
): Promise<WebSocket> {
  let retries = 0;
  const MAX_RETRIES = 1; // retry once if ticket expired

  async function attempt(): Promise<WebSocket> {
    const { ticket } = await getWsTicket(peer);
    const ws = new WebSocket(`${WS_BASE}/ws/chat?ticket=${encodeURIComponent(ticket)}`);

    ws.onopen = () => {
      console.log("[chatWs] connected");
      handlers.onOpen?.();
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        handlers.onMessage?.(data);
      } catch {
        console.warn("[chatWs] failed to parse message", evt.data);
      }
    };

    ws.onerror = (err) => {
      console.error("[chatWs] error", err);
      handlers.onError?.(err);
    };

    ws.onclose = async (evt) => {
      console.log("[chatWs] closed", evt.code, evt.reason);

      // If 401 (invalid/expired ticket) and we haven't retried yet, retry
      if (evt.code === 1008 && retries < MAX_RETRIES) {
        retries++;
        console.log(`[chatWs] ticket expired, retrying (${retries}/${MAX_RETRIES})...`);
        try {
          const newWs = await attempt();
          // Replace handlers to forward to new ws
          Object.assign(ws, newWs);
        } catch (e) {
          console.error("[chatWs] retry failed", e);
          handlers.onClose?.();
        }
      } else {
        handlers.onClose?.();
      }
    };

    return ws;
  }

  return attempt();
}
