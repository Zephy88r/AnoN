import { BellIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "../contexts/NotificationContext";

interface NotificationBellProps {
  onToggle: () => void;
}

export default function NotificationBell({ onToggle }: NotificationBellProps) {
  const { hasUnread } = useNotifications();
  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      type="button"
      className={`relative rounded-lg p-1.5 hover:bg-emerald-500/10 dark:hover:bg-green-500/10 ${focusRing} text-slate-700 dark:text-green-400 transition-colors`}
      aria-label="Notifications"
      title="Notifications"
    >
      <BellIcon className="h-5 w-5" />

      {/* Green blinking dot - only show if there are unread notifications */}
      {hasUnread && (
        <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-green-400 rounded-full animate-pulse" />
      )}
    </button>
  );
}
