import {
  LinkIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  CheckBadgeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export type LinkStatus = "active" | "used" | "revoked" | "expired";

interface LinkCardProps {
  fromMe: boolean;
  code: string;
  expiresIn: string;
  note?: string;
  time: string;
  status: LinkStatus;
  meta?: string;
  onRevoke?: () => void;
}

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

export default function LinkCard({
  fromMe,
  code,
  expiresIn,
  note,
  time,
  status,
  meta,
  onRevoke,
}: LinkCardProps) {
  const align = fromMe ? "justify-end" : "justify-start";

  const isActive = status === "active";
  const isUsed = status === "used";
  const isRevoked = status === "revoked";
  const isExpired = status === "expired";

  const container =
    isActive
      ? "bg-white/75 dark:bg-black/45 border-emerald-500/20 dark:border-green-500/25"
      : "bg-white/60 dark:bg-black/35 border-slate-300 dark:border-green-500/15";

  const badgeStyle =
    isActive || isUsed
      ? "bg-emerald-500/10 text-emerald-800 dark:bg-green-500/10 dark:text-green-200 border-emerald-500/25 dark:border-green-500/25"
      : "bg-slate-200 text-slate-700 dark:bg-black/40 dark:text-green-300/70 border-slate-300 dark:border-green-500/15";

  const badgeText = isActive
    ? `expires ${expiresIn}`
    : isUsed
    ? "used"
    : isRevoked
    ? "revoked"
    : "expired";

  return (
    <div className={`flex ${align}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-3 text-sm border ${container}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-emerald-700 dark:text-green-300" />
            <div>
              <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400">
                Link Card
              </div>
              <div className="font-mono text-lg text-slate-950 dark:text-green-100">
                {code}
              </div>
            </div>
          </div>

          <span
            className={`px-2 py-1 rounded-full text-xs font-mono border ${badgeStyle}`}
          >
            {badgeText}
          </span>
        </div>

        {/* Note */}
        {note && (
          <div className="mt-2 text-sm text-slate-700 dark:text-green-300/80">
            {note}
          </div>
        )}

        {/* Meta */}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-600 dark:text-green-300/60">
            {time}
          </div>

          {meta && (
            <div className="flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-green-300/60">
              {isUsed ? (
                <CheckBadgeIcon className="h-4 w-4" />
              ) : (
                <ClockIcon className="h-4 w-4" />
              )}
              <span>{meta}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            disabled={!isActive}
            onClick={() => navigator.clipboard?.writeText(code)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs border
              ${
                isActive
                  ? "border-emerald-500/25 dark:border-green-500/25 bg-emerald-500/10 dark:bg-green-500/10 text-slate-800 dark:text-green-200 hover:bg-emerald-500/15 dark:hover:bg-green-500/15"
                  : "border-emerald-500/10 dark:border-green-500/10 text-slate-400 dark:text-green-400/40 cursor-not-allowed"
              }
              ${focusRing}`}
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            Copy
          </button>

          {fromMe && isActive && onRevoke && (
            <button
              onClick={onRevoke}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs
                border border-slate-300 dark:border-green-500/15
                bg-white/60 dark:bg-black/30
                text-slate-700 dark:text-green-300/70
                hover:bg-slate-100 dark:hover:bg-green-500/10
                ${focusRing}`}
            >
              <XMarkIcon className="h-4 w-4" />
              Revoke
            </button>
          )}

          {(isUsed || isExpired) && (
            <span className="text-xs font-mono text-slate-500 dark:text-green-300/60">
              archived
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
