// Generates likely conversational responses to a Japanese phrase using
// OpenAI Chat Completions. Cached per-card in IndexedDB so each card only
// hits the API at most once per device.

import {
  getCachedResponses,
  hashText,
  putCachedResponses,
} from "./audioCache";

export interface LikelyResponse {
  japanese: string;
  romaji: string;
  english: string;
}

const SYSTEM_PROMPT =
  "You are a Japanese language tutor helping a tourist visiting Japan. " +
  "When given a phrase the tourist might say, you generate 1-3 short, " +
  "natural responses a Japanese speaker (often shop staff, restaurant " +
  "staff, transit workers, or strangers) would actually give in that " +
  "situation. Vary the responses to cover common scenarios (yes / no, " +
  "directions, prices, polite refusals, follow-ups). Keep them brief — " +
  "what people really say, not textbook sentences. Always reply with " +
  'JSON only in this exact shape: {"responses":[{"japanese":"…","romaji":"…","english":"…"}]}.';

function userPrompt(english: string, japanese: string): string {
  return `English: ${english}\nJapanese: ${japanese}\n\nGenerate 1-3 likely responses.`;
}

export async function fetchLikelyResponses(
  cardId: string,
  english: string,
  japanese: string,
  apiKey: string
): Promise<LikelyResponse[]> {
  const cacheKey = `${cardId}-${hashText(japanese)}`;

  const cached = await getCachedResponses<LikelyResponse[]>(cacheKey);
  if (cached) return cached;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(english, japanese) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${body || "request failed"}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  let parsed: { responses?: LikelyResponse[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned malformed JSON");
  }

  const responses = (parsed.responses ?? [])
    .filter(
      (r): r is LikelyResponse =>
        typeof r?.japanese === "string" &&
        typeof r?.romaji === "string" &&
        typeof r?.english === "string"
    )
    .slice(0, 3);

  if (responses.length === 0) {
    throw new Error("OpenAI returned no usable responses");
  }

  await putCachedResponses(cacheKey, responses);
  return responses;
}
