export type Mode = "say" | "hear" | "read";

export interface PhraseCard {
  id: string;
  english: string;
  japanese: string;
  romaji: string;
  category?: string;
  modes: Mode[];
  notes?: string;
  // True for user-added or user-edited cards: skip the pre-generated audio file
  // and fall through to Web Speech directly. (The bundled audio is keyed by id
  // and would be stale for edited Japanese text.)
  noFile?: boolean;
}

export interface ReviewEntry {
  timestamp: number;
  mode: Mode;
  correct: boolean;
}

export interface ReviewRecord {
  cardId: string;
  history: ReviewEntry[];
}

export type AudioSource = "local" | "openai";

export interface AppSettings {
  showRomajiByDefault: boolean;
  speechRate: number;
  tripDate: string; // YYYY-MM-DD, local
  audioSource: AudioSource;
  openaiApiKey?: string; // never synced — per-device only
}

export interface AppState {
  reviews: Record<string, ReviewRecord>;
  settings: AppSettings;
  phrases: PhraseCard[];
}
