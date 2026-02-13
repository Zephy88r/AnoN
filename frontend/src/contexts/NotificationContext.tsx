import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: "message" | "trust" | "post" | "system";
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Welcome to G-host",
      message: "Your account has been created successfully. Start exploring!",
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      isRead: false,
      type: "system",
    },
    {
      id: "2",
      title: "New Message",
      message: "You have a new message from a user in your network.",
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      isRead: false,
      type: "message",
    },
    {
      id: "3",
      title: "Trust Request",
      message: "Someone wants to establish trust with you.",
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      isRead: false,
      type: "trust",
    },
  ]);

  const hasUnread = notifications.some((n) => !n.isRead);

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
