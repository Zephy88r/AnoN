import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { storage } from "../services/storage";
import { fetchTrustStatus } from "../services/trustApi";
import { getSessionToken } from "../services/api";

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: "message" | "trust" | "post" | "system";
  route?: string;
  sourceKey?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  hasUnread: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

const NOTIFICATIONS_STORAGE_KEY = "notifications";
const NOTIFICATIONS_VERSION = 1;

type StoredNotification = Notification;

function sortNewestFirst(items: StoredNotification[]): StoredNotification[] {
  return [...items].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function hasNotificationWithSource(
  items: StoredNotification[],
  sourceKey: string
): boolean {
  return items.some((item) => item.sourceKey === sourceKey);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const fromStorage = storage.getJSON<StoredNotification[]>(
      NOTIFICATIONS_STORAGE_KEY,
      [],
      { version: NOTIFICATIONS_VERSION }
    );
    return sortNewestFirst(fromStorage);
  });
  const statusSnapshotRef = useRef<Record<string, string>>({});

  const hasUnread = notifications.some((n) => !n.isRead);

  useEffect(() => {
    storage.setJSON(
      NOTIFICATIONS_STORAGE_KEY,
      notifications,
      { version: NOTIFICATIONS_VERSION }
    );
  }, [notifications]);

  useEffect(() => {
    let mounted = true;

    const syncTrustNotifications = async () => {
      if (!getSessionToken()) return;

      try {
        const trust = await fetchTrustStatus();
        if (!mounted) return;

        setNotifications((prev) => {
          let next = sortNewestFirst(prev);
          const nextSnapshot: Record<string, string> = {};

          for (const req of trust.incoming ?? []) {
            const requestId = String(req?.request_id ?? "");
            const fromAnon = String(req?.from_anon ?? "unknown");
            const status = String(req?.status ?? "pending");
            const createdAt =
              String(req?.created_at ?? req?.updated_at ?? new Date().toISOString());

            if (!requestId) continue;
            nextSnapshot[requestId] = status;

            if (status === "pending") {
              const sourceKey = `trust:incoming:${requestId}:pending`;
              if (!hasNotificationWithSource(next, sourceKey)) {
                next = [
                  {
                    id: `ntf_${Date.now()}_${requestId}`,
                    title: "New trust request",
                    message: `${fromAnon.slice(0, 8)} wants to connect with you.`,
                    createdAt,
                    isRead: false,
                    type: "trust",
                    route: "/app/trust",
                    sourceKey,
                  },
                  ...next,
                ];
              }
            }
          }

          for (const req of trust.outgoing ?? []) {
            const requestId = String(req?.request_id ?? "");
            const toAnon = String(req?.to_anon ?? "unknown");
            const status = String(req?.status ?? "pending");
            const changedAt =
              String(req?.updated_at ?? req?.created_at ?? new Date().toISOString());

            if (!requestId) continue;
            nextSnapshot[requestId] = status;

            const previousStatus = statusSnapshotRef.current[requestId];
            const isDecision = status === "accepted" || status === "declined";
            if (isDecision && previousStatus && previousStatus !== status) {
              const sourceKey = `trust:outgoing:${requestId}:${status}`;
              if (!hasNotificationWithSource(next, sourceKey)) {
                next = [
                  {
                    id: `ntf_${Date.now()}_${requestId}_${status}`,
                    title: status === "accepted" ? "Trust accepted" : "Trust declined",
                    message:
                      status === "accepted"
                        ? `${toAnon.slice(0, 8)} accepted your trust request.`
                        : `${toAnon.slice(0, 8)} declined your trust request.`,
                    createdAt: changedAt,
                    isRead: false,
                    type: "trust",
                    route: "/app/trust",
                    sourceKey,
                  },
                  ...next,
                ];
              }
            }
          }

          statusSnapshotRef.current = nextSnapshot;
          return sortNewestFirst(next).slice(0, 100);
        });
      } catch {
        // Ignore transient notification sync errors
      }
    };

    syncTrustNotifications();
    const interval = window.setInterval(syncTrustNotifications, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          ...notification,
        },
        ...prev,
      ]);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        hasUnread,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
