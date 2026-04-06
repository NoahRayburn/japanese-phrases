import { useState } from "react";
import type { AppSettings, AudioSource } from "../types";
import type { SyncStatus } from "../cloudSync";
import { clearAudioCache } from "../audioCache";

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
  const [showKey, setShowKey] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const setSource = (audioSource: AudioSource) =>
    onChange({ ...settings, audioSource });

  const handleClearCache = async () => {
    await clearAudioCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
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

        {/* Voice source */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
          <p className="text-sm font-medium mb-2">Voice</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSource("local")}
              className={`py-2 rounded-lg text-sm font-medium ${
                settings.audioSource === "local"
                  ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Kyoko
            </button>
            <button
              onClick={() => setSource("openai")}
              className={`py-2 rounded-lg text-sm font-medium ${
                settings.audioSource === "openai"
                  ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              OpenAI (alloy)
            </button>
          </div>

          {settings.audioSource === "openai" && (
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                OpenAI API key
              </label>
              <div className="flex gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.openaiApiKey ?? ""}
                  onChange={(e) =>
                    onChange({ ...settings, openaiApiKey: e.target.value })
                  }
                  placeholder="sk-…"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="text-xs px-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Stored only on this device. Each phrase costs ~$0.0005 the
                first time you play it; subsequent plays are cached locally.
                Falls back to Kyoko if the API call fails.
              </p>
              <button
                onClick={handleClearCache}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                {cacheCleared ? "Cleared ✓" : "Clear audio cache"}
              </button>
            </div>
          )}
        </div>

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
            Stats, review history, and the OpenAI key stay on this device.
          </p>
        </div>
      </div>
    </div>
  );
}
