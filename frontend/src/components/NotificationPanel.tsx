import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimeAgo(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return created.toLocaleDateString();
}

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps) {
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    // You can extend this with different notification types and routes
    switch (notification.type) {
      case "message":
        navigate("/app/messages");
        break;
      case "trust":
        navigate("/app/trust");
        break;
      case "post":
        navigate("/app/feed");
        break;
      default:
        navigate("/app/feed");
    }
    
    onClose();
  };

  const handleShowAll = () => {
    navigate("/app/notifications");
    onClose();
  };

  // Show only the latest 3 notifications
  const latestNotifications = notifications.slice(0, 3);

  return (
    <>
      {/* Overlay - only show when panel is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[800]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Notification Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-[380px] bg-black/95 border-l border-emerald-500/20 dark:border-green-500/30 shadow-2xl transform transition-transform duration-300 ease-out z-[900] flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 sticky top-0 px-6 py-4 border-b border-emerald-500/10 dark:border-green-500/10 bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100 dark:text-green-300">
              Notifications
            </h2>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-200 dark:hover:text-green-400 transition-colors p-1 rounded-lg hover:bg-slate-700 dark:hover:bg-green-500/10"
              aria-label="Close notifications"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications List - Scrollable Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-emerald-500/10 dark:divide-green-500/10 min-h-0">
          {latestNotifications.length === 0 ? (
            <div className="p-6 text-center text-slate-400 dark:text-green-400/70">
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            latestNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-6 py-4 cursor-pointer transition-colors hover:bg-black/40 ${
                  notification.isRead
                    ? "bg-black/30 dark:hover:bg-green-500/5"
                    : "bg-green-500/10 hover:bg-green-500/15 dark:bg-green-500/10 dark:hover:bg-green-500/15"
                }`}
              >
                <div className="flex items-start gap-3">
                  {!notification.isRead && (
                    <div className="mt-2 h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-100 dark:text-green-300 truncate">
                      {notification.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-green-400/70 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-green-400/50 mt-2">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Button */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-emerald-500/10 dark:border-green-500/10 bg-black/60">
          <button
            onClick={handleShowAll}
            type="button"
            className="w-full py-2.5 px-4 text-sm font-medium text-emerald-400 dark:text-green-300 hover:bg-emerald-500/10 dark:hover:bg-green-500/15 rounded-lg transition-colors border border-emerald-500/30 dark:border-green-500/30"
          >
            Show All Notifications
          </button>
        </div>
      </div>
    </>
  );
}
