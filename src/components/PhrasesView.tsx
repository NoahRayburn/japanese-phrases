import { useState } from "react";
import type { Mode, PhraseCard } from "../types";
import { newPhraseId } from "../storage";

interface Props {
  phrases: PhraseCard[];
  onChange: (phrases: PhraseCard[]) => void;
  onResetDefaults: () => void;
}

const ALL_MODES: Mode[] = ["say", "read"];
const MODE_LABEL: Record<string, string> = {
  say: "Say / Hear",
  read: "Read",
};

export function PhrasesView({ phrases, onChange, onResetDefaults }: Props) {
  const [mode, setMode] = useState<Mode>("say");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PhraseCard | null>(null);
  const [adding, setAdding] = useState(false);

  // Show only cards that include the active mode. Treat hear cards as say cards to show migration mapping.
  const inMode = phrases.filter((c) => c.modes.includes(mode) || (mode === "say" && c.modes.includes("hear")));

  const filtered = inMode.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.english.toLowerCase().includes(q) ||
      c.japanese.toLowerCase().includes(q) ||
      c.romaji.toLowerCase().includes(q)
    );
  });

  const handleSave = (card: PhraseCard) => {
    const exists = phrases.some((p) => p.id === card.id);
    const next = exists
      ? phrases.map((p) => (p.id === card.id ? card : p))
      : [card, ...phrases];
    onChange(next);
    setEditing(null);
    setAdding(false);
  };

  // Delete from this mode only. If it was the card's last mode, remove the
  // card entirely. This way one phrase can live in multiple lists, but you
  // can curate them independently.
  const handleDeleteFromMode = (id: string) => {
    const card = phrases.find((p) => p.id === id);
    if (!card) return;
    const remainingModes = card.modes.filter((m) => m !== mode);
    if (remainingModes.length === 0) {
      if (!confirm("This is the only mode for this phrase. Delete it entirely?"))
        return;
      onChange(phrases.filter((p) => p.id !== id));
    } else {
      onChange(
        phrases.map((p) =>
          p.id === id ? { ...p, modes: remainingModes } : p
        )
      );
    }
    setEditing(null);
  };

  // Used by the editor's Delete button — wipes the card from all modes.
  const handleDeleteAll = (id: string) => {
    if (!confirm("Delete this phrase entirely (from all modes)?")) return;
    onChange(phrases.filter((p) => p.id !== id));
    setEditing(null);
  };

  const handleReset = () => {
    if (
      !confirm(
        "Reset phrases to defaults? Your additions and edits will be lost. Review history will be kept."
      )
    )
      return;
    onResetDefaults();
  };

  const counts: Record<string, number> = {
    say: phrases.filter((c) => c.modes.includes("say") || c.modes.includes("hear")).length,
    read: phrases.filter((c) => c.modes.includes("read")).length,
  };

  return (
    <div className="p-4 space-y-3">
      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {ALL_MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-2 rounded-xl text-sm font-medium ${
              mode === m
                ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {MODE_LABEL[m]}
            <span className="ml-1 opacity-60 text-xs">{counts[m]}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} in {MODE_LABEL[mode]}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            Reset
          </button>
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-medium"
          >
            + Add
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
      />

      <ul className="space-y-2">
        {filtered.map((card) => (
          <li
            key={card.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-start gap-3"
          >
            <button
              onClick={() => setEditing(card)}
              className="flex-1 text-left min-w-0"
            >
              <p className="jp text-lg font-medium leading-tight truncate">
                {card.japanese}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {card.english}
              </p>
              {(card.romaji || card.modes.length > 1) && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {card.romaji}
                  {card.modes.length > 1 &&
                    ` · also in ${card.modes
                      .filter((m) => m !== mode && m !== "hear")
                      .map((m) => MODE_LABEL[m])
                      .filter(Boolean)
                      .join(", ")}`}
                </p>
              )}
            </button>
            <button
              onClick={() => handleDeleteFromMode(card.id)}
              className="text-slate-400 hover:text-rose-500 px-2 py-1 text-sm"
              aria-label="Remove from this mode"
            >
              ✕
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-center text-slate-400 py-8 text-sm">
            {inMode.length === 0
              ? `No phrases in ${MODE_LABEL[mode]} yet. Tap + Add.`
              : "No phrases match."}
          </li>
        )}
      </ul>

      {(editing || adding) && (
        <PhraseEditor
          card={editing}
          defaultMode={mode}
          onSave={handleSave}
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
          onDelete={editing ? () => handleDeleteAll(editing.id) : undefined}
        />
      )}
    </div>
  );
}

function PhraseEditor({
  card,
  defaultMode,
  onSave,
  onCancel,
  onDelete,
}: {
  card: PhraseCard | null;
  defaultMode: Mode;
  onSave: (card: PhraseCard) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [english, setEnglish] = useState(card?.english ?? "");
  const [japanese, setJapanese] = useState(card?.japanese ?? "");
  const [romaji, setRomaji] = useState(card?.romaji ?? "");
  const [notes, setNotes] = useState(card?.notes ?? "");
  const [modes, setModes] = useState<Mode[]>(card?.modes ?? [defaultMode]);

  const toggleMode = (m: Mode) => {
    setModes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const canSave =
    english.trim().length > 0 &&
    japanese.trim().length > 0 &&
    modes.length > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    const japaneseChanged = card ? card.japanese !== japanese.trim() : true;
    onSave({
      id: card?.id ?? newPhraseId(),
      english: english.trim(),
      japanese: japanese.trim(),
      romaji: romaji.trim(),
      notes: notes.trim() || undefined,
      modes,
      // New cards or edits to Japanese text → use TTS fallback (the bundled
      // audio file is keyed by id and would be stale).
      noFile: card ? card.noFile || japaneseChanged : true,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {card ? "Edit phrase" : "New phrase"}
          </h2>
          <button
            onClick={onCancel}
            className="text-slate-400 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <Field label="English">
          <input
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Japanese">
          <input
            value={japanese}
            onChange={(e) => setJapanese(e.target.value)}
            className="jp w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-base"
          />
        </Field>

        <Field label="Romaji (optional)">
          <input
            value={romaji}
            onChange={(e) => setRomaji(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Modes">
          <div className="flex gap-2">
            {ALL_MODES.map((m) => (
              <button
                key={m}
                onClick={() => toggleMode(m)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  modes.includes(m)
                    ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-2 pt-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 text-sm rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="px-4 py-2 text-sm rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
