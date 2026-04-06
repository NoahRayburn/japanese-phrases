import { useEffect, useState } from "react";
import type { AudioSource, Mode, PhraseCard } from "../types";
import { playPhrase } from "../audio";
import {
  fetchLikelyResponses,
  type LikelyResponse,
} from "../openaiResponses";

interface Props {
  card: PhraseCard;
  mode: Mode;
  speechRate: number;
  showRomaji: boolean;
  audioSource: AudioSource;
  openaiKey?: string;
  onGrade: (correct: boolean) => void;
}

type ResponseState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; responses: LikelyResponse[] }
  | { kind: "error"; message: string }
  | { kind: "no-key" };

export function FlashCard({
  card,
  mode,
  speechRate,
  showRomaji,
  audioSource,
  openaiKey,
  onGrade,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [responseState, setResponseState] = useState<ResponseState>({
    kind: "idle",
  });
  const [revealedTranslations, setRevealedTranslations] = useState<Set<number>>(
    new Set()
  );

  // Reset everything whenever card changes.
  useEffect(() => {
    setRevealed(false);
    setResponseState({ kind: "idle" });
    setRevealedTranslations(new Set());
  }, [card.id, mode]);

  const playOptions = {
    rate: speechRate,
    noFile: card.noFile,
    source: audioSource,
    openaiKey,
  };

  // In Hear mode, attempt to auto-play when a new card appears.
  useEffect(() => {
    if (mode === "hear" && !revealed) {
      playPhrase(card.id, card.japanese, playOptions).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    card.id,
    mode,
    revealed,
    speechRate,
    card.japanese,
    card.noFile,
    audioSource,
    openaiKey,
  ]);

  // After reveal on a Say card, fetch likely responses.
  useEffect(() => {
    if (!revealed || mode !== "say") return;
    if (!openaiKey) {
      setResponseState({ kind: "no-key" });
      return;
    }
    let cancelled = false;
    setResponseState({ kind: "loading" });
    fetchLikelyResponses(card.id, card.english, card.japanese, openaiKey)
      .then((responses) => {
        if (!cancelled) setResponseState({ kind: "ready", responses });
      })
      .catch((err) => {
        if (!cancelled)
          setResponseState({
            kind: "error",
            message: err?.message ?? "Failed to load responses",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [revealed, mode, card.id, card.english, card.japanese, openaiKey]);

  const play = () => playPhrase(card.id, card.japanese, playOptions);

  const playResponse = (index: number, japanese: string) => {
    // Synthetic id so the audio cache stores each response separately.
    playPhrase(`${card.id}-resp-${index}`, japanese, {
      ...playOptions,
      noFile: true,
    });
  };

  const toggleTranslation = (index: number) => {
    setRevealedTranslations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Romaji is hidden by default in Hear mode.
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

      {/* Likely responses (Say mode only, after reveal) */}
      {revealed && mode === "say" && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Likely responses
          </p>
          {responseState.kind === "loading" && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generating…
            </p>
          )}
          {responseState.kind === "no-key" && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Set your OpenAI key in Settings to see likely responses.
            </p>
          )}
          {responseState.kind === "error" && (
            <p className="text-sm text-rose-500">
              Couldn't load responses: {responseState.message}
            </p>
          )}
          {responseState.kind === "ready" && (
            <ul className="space-y-2">
              {responseState.responses.map((r, i) => {
                const shown = revealedTranslations.has(i);
                return (
                  <li
                    key={i}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <p className="jp text-lg flex-1 leading-snug">
                        {r.japanese}
                      </p>
                      <button
                        onClick={() => playResponse(i, r.japanese)}
                        className="text-slate-500 dark:text-slate-400 px-2"
                        aria-label="Play response"
                      >
                        🔊
                      </button>
                      <button
                        onClick={() => toggleTranslation(i)}
                        className="text-xs px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        {shown ? "Hide" : "EN"}
                      </button>
                    </div>
                    {shown && (
                      <div className="mt-2 text-sm space-y-0.5">
                        <p className="text-slate-500 dark:text-slate-400 italic">
                          {r.romaji}
                        </p>
                        <p className="text-slate-700 dark:text-slate-200">
                          {r.english}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

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
