import type { Mode } from "../types";

export type Tab = Mode | "stats" | "phrases";

const TABS: { id: Tab; label: string }[] = [
  { id: "say", label: "Say" },
  { id: "hear", label: "Hear" },
  { id: "read", label: "Read" },
  { id: "stats", label: "Stats" },
  { id: "phrases", label: "List" },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="grid grid-cols-5 border-b border-slate-200 dark:border-slate-700">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`py-3 text-sm font-medium transition-colors ${
            active === t.id
              ? "text-slate-900 dark:text-white border-b-2 border-rose-500"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
