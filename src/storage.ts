import type { AppState, Mode, ReviewEntry } from "./types";
import { phrases as seedPhrases } from "./data/phrases";

const KEY = "jp-learner-state";

const DEFAULT_STATE: AppState = {
  reviews: {},
  settings: {
    showRomajiByDefault: true,
    speechRate: 0.85,
    tripDate: "2026-04-27",
    audioSource: "local",
  },
  phrases: seedPhrases,
  phrasesUpdatedAt: 0,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      reviews: parsed.reviews ?? {},
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
      phrases:
        parsed.phrases && parsed.phrases.length > 0
          ? parsed.phrases
          : seedPhrases,
      phrasesUpdatedAt: parsed.phrasesUpdatedAt ?? 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save state", e);
  }
}

export function recordReview(
  state: AppState,
  cardId: string,
  mode: Mode,
  correct: boolean
): AppState {
  const entry: ReviewEntry = { timestamp: Date.now(), mode, correct };
  const existing = state.reviews[cardId];
  const history = existing ? [...existing.history, entry] : [entry];
  return {
    ...state,
    reviews: {
      ...state.reviews,
      [cardId]: { cardId, history },
    },
  };
}

export function resetPhrases(state: AppState): AppState {
  return { ...state, phrases: seedPhrases };
}

export function newPhraseId(): string {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
