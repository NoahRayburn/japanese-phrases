import type { AppState, Mode, PhraseCard, ReviewRecord } from "./types";

export function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function daysUntil(tripDate: string): number {
  const [y, m, d] = tripDate.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date();
  const todayMs = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  return Math.round((target - todayMs) / (1000 * 60 * 60 * 24));
}

export function cardsForMode(phrases: PhraseCard[], mode: Mode) {
  return phrases.filter((c) => c.modes.includes(mode));
}

// Mode-scoped helpers — review history is filtered to entries for that mode.
function modeHistory(record: ReviewRecord | undefined, mode: Mode) {
  if (!record) return [];
  return record.history.filter((h) => h.mode === mode);
}

// "Mastered" = answered correctly at least 2 of the last 3 attempts in this mode.
export function isMastered(
  record: ReviewRecord | undefined,
  mode: Mode
): boolean {
  const h = modeHistory(record, mode);
  if (h.length < 2) return false;
  const recent = h.slice(-3);
  const correct = recent.filter((e) => e.correct).length;
  return correct >= 2;
}

export function modeStats(state: AppState, mode: Mode) {
  const cards = cardsForMode(state.phrases, mode);
  let mastered = 0;
  let seen = 0;
  let totalAttempts = 0;
  let totalCorrect = 0;
  for (const card of cards) {
    const rec = state.reviews[card.id];
    if (rec && modeHistory(rec, mode).length > 0) seen++;
    if (isMastered(rec, mode)) mastered++;
    if (rec) {
      const h = modeHistory(rec, mode);
      totalAttempts += h.length;
      totalCorrect += h.filter((e) => e.correct).length;
    }
  }
  return {
    total: cards.length,
    seen,
    mastered,
    accuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : null,
  };
}

// Cards with worst recent accuracy in a mode (for "weak cards" review).
export function weakCardsForMode(state: AppState, mode: Mode, limit = 15) {
  const cards = cardsForMode(state.phrases, mode);
  const scored = cards
    .map((card) => {
      const rec = state.reviews[card.id];
      const h = modeHistory(rec, mode);
      if (h.length === 0) return { card, score: 1.1, attempts: 0 };
      const recent = h.slice(-5);
      const correct = recent.filter((e) => e.correct).length;
      return { card, score: correct / recent.length, attempts: h.length };
    })
    .filter((s) => s.attempts > 0 && s.score < 1)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.card);
  return scored;
}

// Daily accuracy series per mode for the chart.
export function accuracyTimeSeries(state: AppState, mode: Mode, days = 14) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const buckets: { date: string; correct: number; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    buckets.push({ date: label, correct: 0, total: 0 });
  }
  const startOfWindow =
    new Date().setHours(0, 0, 0, 0) - (days - 1) * dayMs;
  for (const rec of Object.values(state.reviews)) {
    for (const e of rec.history) {
      if (e.mode !== mode) continue;
      if (e.timestamp < startOfWindow) continue;
      const dayIdx = Math.floor((e.timestamp - startOfWindow) / dayMs);
      if (dayIdx < 0 || dayIdx >= days) continue;
      buckets[dayIdx].total++;
      if (e.correct) buckets[dayIdx].correct++;
    }
  }
  return buckets.map((b) => ({
    date: b.date,
    accuracy: b.total > 0 ? Math.round((b.correct / b.total) * 100) : null,
  }));
}
