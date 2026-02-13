import { useNotifications } from "../contexts/NotificationContext";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

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

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, hasUnread } =
    useNotifications();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Page Header */}
      <div className="border-b border-emerald-500/20 dark:border-green-500/20 px-6 py-8 bg-white/50 dark:bg-black/50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-mono text-emerald-700 dark:text-green-400 mb-2">
            Notifications
          </h1>
          <p className="text-slate-600 dark:text-green-400/70 text-sm">
            {notifications.length > 0
              ? `You have ${notifications.filter((n) => !n.isRead).length} unread notification${notifications.filter((n) => !n.isRead).length !== 1 ? "s" : ""}`
              : "No notifications"}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Mark All As Read Button */}
        {hasUnread && (
          <div className="mb-6">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-green-400 hover:bg-emerald-50 dark:hover:bg-green-500/10 rounded-lg transition-colors border border-emerald-200 dark:border-green-500/30"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-green-500/10 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-emerald-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-green-300 mb-2">
              All caught up!
            </h2>
            <p className="text-slate-600 dark:text-green-400/70">
              You have no notifications at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  notification.isRead
                    ? "border-slate-200 dark:border-green-500/20 bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-green-500/5"
                    : "border-green-300 dark:border-green-500/40 bg-emerald-50 dark:bg-green-500/10 hover:bg-emerald-100 dark:hover:bg-green-500/15"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon/Indicator */}
                  <div className="flex-shrink-0 pt-0.5">
                    {!notification.isRead && (
                      <div className="h-3 w-3 rounded-full bg-green-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-green-300">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-green-400/70 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-xs font-medium text-green-700 dark:text-green-300">
                            New
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-slate-400 dark:text-green-400/50 mt-3">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
