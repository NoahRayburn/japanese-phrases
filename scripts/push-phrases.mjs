#!/usr/bin/env node
// One-shot script to push the local phrases.json directly to Firestore
// via the REST API (the same path the browser SDK uses, no gRPC).
// Requires open Firestore rules (allow read, write: if true) on jp-learner.
//
// Reads VITE_FIREBASE_* from .env.local. Run: node scripts/push-phrases.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envText = readFileSync(join(root, ".env.local"), "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const apiKey = env.VITE_FIREBASE_API_KEY;
const projectId = env.VITE_FIREBASE_PROJECT_ID;

if (!apiKey || !projectId) {
  console.error("Missing VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID");
  process.exit(1);
}

const phrases = JSON.parse(
  readFileSync(join(root, "src", "data", "phrases.json"), "utf-8")
);

// Encode a JS value into Firestore's REST JSON value format.
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toValue) } };
  }
  if (typeof v === "object") {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toValue(val);
    return { mapValue: { fields } };
  }
  throw new Error(`Cannot encode: ${typeof v}`);
}

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/jp-learner/phrases?key=${apiKey}`;

const body = {
  fields: {
    phrases: toValue(phrases),
    updatedAt: { timestampValue: new Date().toISOString() },
  },
};

// Use updateMask so the PATCH replaces only these fields (and replaces them
// fully — without an updateMask, REST treats the request as a merge against
// the existing document's field set).
const urlWithMask = `${url}&updateMask.fieldPaths=phrases&updateMask.fieldPaths=updatedAt`;

console.log(`Pushing ${phrases.length} phrases to Firestore via REST…`);
const res = await fetch(urlWithMask, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`);
  console.error(text);
  process.exit(1);
}

// Parse to confirm the doc was actually written.
const written = JSON.parse(text);
const writtenCount =
  written.fields?.phrases?.arrayValue?.values?.length ?? "unknown";
console.log(`✓ Done. Document now contains ${writtenCount} phrases.`);
