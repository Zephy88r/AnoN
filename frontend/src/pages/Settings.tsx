import { useTheme } from "../contexts/ThemeContext";
import { getAnonDeviceKey } from "../services/geo";

const card =
  "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-4";

export default function Settings() {
  const { theme } = useTheme();

  // stable anon id (shortened for display)
  const anonId = getAnonDeviceKey()
    .replace("dev_", "")
    .slice(0, 8)
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
          Settings
        </h1>
        <p className="text-sm text-slate-700 dark:text-green-300/70">
          Control your presence on the network
        </p>
      </div>

      {/* ===============================
         Appearance
      =============================== */}
      <div className={card}>
        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
          Appearance
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-800 dark:text-green-200">
            Theme
          </span>
          <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
            {theme}
          </span>
        </div>

        <div className="mt-2 text-xs text-slate-600 dark:text-green-300/70">
          Theme follows system preference unless changed.
        </div>
      </div>

      {/* ===============================
         Privacy
      =============================== */}
      <div className={card}>
        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
          Privacy
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-800 dark:text-green-200">
            Ghost Mode
          </span>
          <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
            ON
          </span>
        </div>

        <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
          Your location and identity are never exposed.
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-slate-800 dark:text-green-200">
            Region Visibility
          </span>
          <span className="font-mono text-sm text-slate-600 dark:text-green-300/70">
            Manual
          </span>
        </div>

        <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
          Only coarse regions are shared. No GPS history is stored.
        </div>
      </div>

      {/* ===============================
         Identity
      =============================== */}
      <div className={card}>
        <div className="font-mono text-xs tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-3">
          Identity
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-800 dark:text-green-200">
            Anonymous ID
          </span>
          <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
            User #{anonId}
          </span>
        </div>

        <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
          This ID is device-bound and cannot be changed.
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-slate-800 dark:text-green-200">
            Recovery Keys
          </span>
          <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
            Generated
          </span>
        </div>

        <div className="mt-1 text-xs text-slate-600 dark:text-green-300/70">
          Used to restore access on a new device (later).
        </div>
      </div>
    </div>
  );
}
