import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useOutsideClick } from "../hooks/useOutsideClick";

interface NotificationDropdownProps {
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

export default function NotificationDropdown({
  onClose,
}: NotificationDropdownProps) {
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useOutsideClick(onClose);

  // Show only the latest 3 notifications
  const latestNotifications = notifications.slice(0, 3);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleShowAll = () => {
    navigate("/app/notifications");
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-black border border-emerald-500/20 dark:border-green-500/20 rounded-lg shadow-2xl dark:shadow-2xl dark:shadow-green-500/30 z-[9999]"
    >
        {/* Header */}
        <div className="px-4 py-3 border-b border-emerald-500/10 dark:border-green-500/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-green-300">
              Notifications
            </h3>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-green-400 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-emerald-500/10 dark:divide-green-500/10 max-h-96 overflow-y-auto">
          {latestNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 dark:text-green-400/50">
              No notifications yet
            </div>
          ) : (
            latestNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id)}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  notification.isRead
                    ? "hover:bg-slate-50 dark:hover:bg-green-500/5"
                    : "bg-emerald-50 dark:bg-green-500/10 hover:bg-emerald-100 dark:hover:bg-green-500/15"
                }`}
              >
                <div className="flex items-start gap-3">
                  {!notification.isRead && (
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-green-300 truncate">
                      {notification.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-green-400/70 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-green-400/50 mt-1.5">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Button */}
        <div className="px-4 py-3 border-t border-emerald-500/10 dark:border-green-500/10">
          <button
            onClick={handleShowAll}
            type="button"
            className="w-full py-2 px-3 text-sm font-medium text-emerald-600 dark:text-green-400 hover:bg-emerald-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
          >
            Show All Notifications
          </button>
        </div>
      </div>
    );
  }
