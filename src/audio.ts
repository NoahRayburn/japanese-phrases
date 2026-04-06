// Audio playback. Prefers pre-generated files in /audio/<id>.m4a;
// falls back to Web Speech API if the file isn't available.

const audioCache = new Map<string, HTMLAudioElement>();
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
  let audio = audioCache.get(cardId);
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}audio/${cardId}.m4a`);
    audio.preload = "auto";
    audioCache.set(cardId, audio);
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

export async function playPhrase(
  cardId: string,
  japanese: string,
  rate = 0.85,
  noFile = false
): Promise<void> {
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
