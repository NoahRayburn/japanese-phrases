import { useEffect, useState } from "react";
import type { Mode, PhraseCard } from "../types";
import { playPhrase } from "../audio";

interface Props {
  card: PhraseCard;
  mode: Mode;
  speechRate: number;
  showRomaji: boolean;
  onGrade: (correct: boolean) => void;
}

export function FlashCard({
  card,
  mode,
  speechRate,
  showRomaji,
  onGrade,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  // Reset reveal whenever card changes.
  useEffect(() => {
    setRevealed(false);
  }, [card.id, mode]);

  // In Hear mode, attempt to auto-play when a new card appears.
  // (May be blocked on first card without a prior gesture.)
  useEffect(() => {
    if (mode === "hear" && !revealed) {
      playPhrase(card.id, card.japanese, speechRate, card.noFile).catch(() => {});
    }
  }, [card.id, mode, revealed, speechRate, card.japanese, card.noFile]);

  const play = () => playPhrase(card.id, card.japanese, speechRate, card.noFile);

  // Romaji is hidden by default in Hear mode (you want sound → meaning,
  // not sound → romaji → meaning).
  const showRomajiHere = showRomaji && mode !== "hear";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[22rem] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        {!revealed ? (
          <>
            {mode === "say" && (
              <p className="text-2xl font-medium leading-snug">
                {card.english}
              </p>
            )}
            {mode === "hear" && (
              <button
                onClick={play}
                className="text-6xl"
                aria-label="Play audio"
              >
                🔊
              </button>
            )}
            {mode === "read" && (
              <p className="jp text-5xl font-semibold leading-tight">
                {card.japanese}
              </p>
            )}
          </>
        ) : (
          <>
            {mode !== "say" && (
              <p className="text-base text-slate-500 dark:text-slate-400">
                {card.english}
              </p>
            )}
            <p className="jp text-3xl font-semibold leading-snug">
              {card.japanese}
            </p>
            {showRomajiHere && (
              <p className="text-base text-slate-500 dark:text-slate-400 italic">
                {card.romaji}
              </p>
            )}
            {mode === "say" && (
              <p className="text-base text-slate-700 dark:text-slate-300">
                {card.english}
              </p>
            )}
            {mode !== "read" && (
              <button
                onClick={play}
                className="mt-1 text-sm px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                🔊 Replay
              </button>
            )}
            {mode === "read" && (
              <button
                onClick={play}
                className="mt-1 text-sm px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                🔊 Hear it
              </button>
            )}
            {card.notes && (
              <details className="mt-2 text-left max-w-md">
                <summary className="text-xs text-slate-500 cursor-pointer">
                  Note
                </summary>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {card.notes}
                </p>
              </details>
            )}
          </>
        )}
      </div>

      <div className="mt-4">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-medium"
          >
            Show answer
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onGrade(false)}
              className="py-3 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200 font-medium"
            >
              ✗ Wrong
            </button>
            <button
              onClick={() => onGrade(true)}
              className="py-3 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 font-medium"
            >
              ✓ Right
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
