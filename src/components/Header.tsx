import { daysUntil } from "../utils";
import type { SyncStatus } from "../cloudSync";

interface Props {
  tripDate: string;
  syncStatus: SyncStatus;
  onOpenSettings: () => void;
}

const STATUS_COLOR: Record<SyncStatus, string> = {
  disabled: "bg-slate-400",
  connecting: "bg-amber-400 animate-pulse",
  synced: "bg-emerald-500",
  offline: "bg-slate-400",
  error: "bg-rose-500",
};

const STATUS_LABEL: Record<SyncStatus, string> = {
  disabled: "Local only",
  connecting: "Connecting…",
  synced: "Synced",
  offline: "Offline",
  error: "Sync error",
};

export function Header({ tripDate, syncStatus, onOpenSettings }: Props) {
  const days = daysUntil(tripDate);
  let label: string;
  if (days > 1) label = `${days} days until Japan 🇯🇵`;
  else if (days === 1) label = `1 day until Japan 🇯🇵`;
  else if (days === 0) label = `Today's the day! 🇯🇵`;
  else label = `Trip in progress / past 🇯🇵`;

  return (
    <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Japanese Phrases</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
          title={STATUS_LABEL[syncStatus]}
        >
          <span
            className={`w-2 h-2 rounded-full ${STATUS_COLOR[syncStatus]}`}
          />
          <span className="hidden sm:inline">{STATUS_LABEL[syncStatus]}</span>
        </span>
        <button
          onClick={onOpenSettings}
          className="text-slate-500 dark:text-slate-400 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
