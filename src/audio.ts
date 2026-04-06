// Audio playback. Three sources, in priority order:
//   1. OpenAI TTS (if source === "openai" and a key is set), cached in IDB
//   2. Pre-generated Kyoko file at /audio/<id>.m4a
//   3. Web Speech API fallback
//
// On-demand TTS calls fail gracefully — if the network or the API rejects,
// we fall through to the local file or browser TTS.

import type { AudioSource } from "./types";
import { getCachedAudio, hashText, putCachedAudio } from "./audioCache";

interface PlayOptions {
  rate?: number;
  /** True for cards added/edited in-app — skip the bundled audio file. */
  noFile?: boolean;
  source?: AudioSource;
  openaiKey?: string;
  /** OpenAI voice id — defaults to alloy. */
  openaiVoice?: string;
}

const fileCache = new Map<string, HTMLAudioElement>();
const missingFiles = new Set<string>();

let voicesReady = false;
let cachedJapaneseVoice: SpeechSynthesisVoice | null = null;

function initVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const load = () => {
    const voices = speechSynthesis.getVoices();
    cachedJapaneseVoice =
      voices.find((v) => v.lang === "ja-JP") ??
      voices.find((v) => v.lang.startsWith("ja")) ??
      null;
    voicesReady = voices.length > 0;
  };
  load();
  if (!voicesReady) {
    speechSynthesis.addEventListener("voiceschanged", load, { once: true });
  }
}

if (typeof window !== "undefined") initVoices();

function playFile(cardId: string, rate: number): Promise<void> {
  if (missingFiles.has(cardId)) return Promise.reject(new Error("missing"));
  let audio = fileCache.get(cardId);
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}audio/${cardId}.m4a`);
    audio.preload = "auto";
    fileCache.set(cardId, audio);
  }
  audio.playbackRate = rate;
  audio.currentTime = 0;
  return new Promise((resolve, reject) => {
    const onErr = () => {
      missingFiles.add(cardId);
      cleanup();
      reject(new Error("file error"));
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      audio!.removeEventListener("error", onErr);
      audio!.removeEventListener("ended", onEnd);
    };
    audio!.addEventListener("error", onErr, { once: true });
    audio!.addEventListener("ended", onEnd, { once: true });
    audio!.play().catch(onErr);
  });
}

function speakViaTTS(japanese: string, rate: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(japanese);
  u.lang = "ja-JP";
  u.rate = rate;
  if (cachedJapaneseVoice) u.voice = cachedJapaneseVoice;
  speechSynthesis.speak(u);
}

async function playOpenAI(
  cardId: string,
  japanese: string,
  apiKey: string,
  voice: string,
  rate: number
): Promise<void> {
  const key = `${cardId}-${voice}-${hashText(japanese)}`;
  let blob = await getCachedAudio(key);
  if (!blob) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice,
        input: japanese,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI TTS ${res.status}: ${text || "request failed"}`);
    }
    blob = await res.blob();
    await putCachedAudio(key, blob);
  }
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.playbackRate = rate;
  await audio.play();
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), {
    once: true,
  });
}

export async function playPhrase(
  cardId: string,
  japanese: string,
  options: PlayOptions = {}
): Promise<void> {
  const {
    rate = 0.85,
    noFile = false,
    source = "local",
    openaiKey,
    openaiVoice = "alloy",
  } = options;

  if (source === "openai" && openaiKey) {
    try {
      await playOpenAI(cardId, japanese, openaiKey, openaiVoice, rate);
      return;
    } catch (e) {
      console.warn("OpenAI TTS failed, falling back to local", e);
    }
  }

  if (noFile) {
    speakViaTTS(japanese, rate);
    return;
  }
  try {
    await playFile(cardId, rate);
  } catch {
    speakViaTTS(japanese, rate);
  }
}

// Best-effort priming call to satisfy iOS Safari's gesture requirement.
// Should be called from a click/tap handler.
export function primeAudio(): void {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    speechSynthesis.speak(u);
  }
}
