import type { AppSettings } from "../types";
import type { SyncStatus } from "../cloudSync";

interface Props {
  settings: AppSettings;
  syncStatus: SyncStatus;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  disabled: "Local only — no Firebase config in this build.",
  connecting: "Connecting to Firestore…",
  synced: "Phrases sync across all your devices.",
  offline: "Offline — changes will sync when you reconnect.",
  error: "Sync error — check the browser console.",
};

export function SettingsPanel({
  settings,
  syncStatus,
  onChange,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Trip date</label>
          <input
            type="date"
            value={settings.tripDate}
            onChange={(e) =>
              onChange({ ...settings, tripDate: e.target.value })
            }
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Speech rate: {settings.speechRate.toFixed(2)}×
          </label>
          <input
            type="range"
            min={0.5}
            max={1.2}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) =>
              onChange({
                ...settings,
                speechRate: parseFloat(e.target.value),
              })
            }
            className="w-full"
          />
        </div>

        <label className="flex items-center justify-between">
          <span className="text-sm font-medium">Show romaji on answer</span>
          <input
            type="checkbox"
            checked={settings.showRomajiByDefault}
            onChange={(e) =>
              onChange({
                ...settings,
                showRomajiByDefault: e.target.checked,
              })
            }
            className="h-5 w-5"
          />
        </label>

        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
          In Hear mode, romaji is hidden regardless — you want sound → meaning.
        </p>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Sync
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {STATUS_TEXT[syncStatus]}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Stats and review history stay on this device.
          </p>
        </div>
      </div>
    </div>
  );
}
