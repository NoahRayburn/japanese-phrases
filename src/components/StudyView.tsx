import { useEffect, useState } from "react";
import type { AppState, Mode, PhraseCard } from "../types";
import { cardsForMode, shuffle, weakCardsForMode } from "../utils";
import { FlashCard } from "./FlashCard";
import { primeAudio } from "../audio";

interface Props {
  mode: Mode;
  state: AppState;
  onGrade: (cardId: string, mode: Mode, correct: boolean) => void;
}

type Filter = "all" | "weak";

export function StudyView({ mode, state, onGrade }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [deck, setDeck] = useState<PhraseCard[]>([]);
  const [index, setIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ right: 0, wrong: 0 });
  const [started, setStarted] = useState(false);

  // Build the deck whenever mode or filter changes.
  // Hear mode reuses the Say pool — same phrases, reversed direction.
  useEffect(() => {
    const poolMode: Mode = mode === "hear" ? "say" : mode;
    const pool =
      filter === "weak"
        ? weakCardsForMode(state, poolMode)
        : cardsForMode(state.phrases, poolMode);
    setDeck(shuffle(pool));
    setIndex(0);
    setSessionStats({ right: 0, wrong: 0 });
    setStarted(false);
    // intentionally don't depend on `state` so an in-session grade doesn't reshuffle the deck
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, filter]);

  const handleStart = () => {
    primeAudio();
    setStarted(true);
  };

  const handleGrade = (correct: boolean) => {
    const card = deck[index];
    onGrade(card.id, mode, correct);
    setSessionStats((s) =>
      correct ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1 }
    );
    setIndex((i) => i + 1);
  };

  const reshuffle = () => {
    setDeck((d) => shuffle(d));
    setIndex(0);
    setSessionStats({ right: 0, wrong: 0 });
  };

  // Empty deck (e.g., weak filter with nothing yet)
  if (deck.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <Filters filter={filter} onChange={setFilter} />
        <div className="text-center text-slate-500 dark:text-slate-400 py-12">
          {filter === "weak"
            ? "No weak cards yet — review some cards first."
            : "No cards available."}
        </div>
      </div>
    );
  }

  // End of deck
  if (index >= deck.length) {
    const total = sessionStats.right + sessionStats.wrong;
    const pct = total > 0 ? Math.round((sessionStats.right / total) * 100) : 0;
    return (
      <div className="p-4 space-y-4">
        <Filters filter={filter} onChange={setFilter} />
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Session complete</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {sessionStats.right} right · {sessionStats.wrong} wrong · {pct}%
          </p>
          <button
            onClick={reshuffle}
            className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-medium"
          >
            Go again
          </button>
        </div>
      </div>
    );
  }

  // Pre-start screen for Hear mode (gesture priming)
  if (mode === "hear" && !started) {
    return (
      <div className="p-4 space-y-4">
        <Filters filter={filter} onChange={setFilter} />
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Listening practice</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
            Audio will play automatically for each card. Tap to begin.
          </p>
          <button
            onClick={handleStart}
            className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-medium"
          >
            Start session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Filters filter={filter} onChange={setFilter} />
      <FlashCard
        card={deck[index]}
        mode={mode}
        speechRate={state.settings.speechRate}
        showRomaji={state.settings.showRomajiByDefault}
        audioSource={state.settings.audioSource}
        openaiKey={state.settings.openaiApiKey}
        onGrade={handleGrade}
      />
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Card {index + 1} of {deck.length} · {sessionStats.right}✓ ·{" "}
        {sessionStats.wrong}✗
      </p>
    </div>
  );
}

function Filters({
  filter,
  onChange,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
}) {
  return (
    <div className="flex gap-2">
      <Chip active={filter === "all"} onClick={() => onChange("all")}>
        All
      </Chip>
      <Chip active={filter === "weak"} onClick={() => onChange("weak")}>
        Weak
      </Chip>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
        active
          ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white"
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
