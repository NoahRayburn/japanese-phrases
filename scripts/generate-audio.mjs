#!/usr/bin/env node
// Generate per-card audio files using macOS `say` with the Kyoko voice.
// Idempotent: skips files that already exist. Run: npm run generate-audio
//
// Requires:
//   - macOS
//   - Kyoko voice installed (System Settings → Accessibility → Spoken Content
//     → System Voice → Manage Voices → Japanese → Kyoko)

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const phrasesPath = join(root, "src", "data", "phrases.json");
const outDir = join(root, "public", "audio");

if (process.platform !== "darwin") {
  console.error("This script only works on macOS (uses the `say` command).");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const phrases = JSON.parse(readFileSync(phrasesPath, "utf-8"));

let generated = 0;
let skipped = 0;
let failed = 0;

for (const card of phrases) {
  const file = join(outDir, `${card.id}.m4a`);
  if (existsSync(file)) {
    skipped++;
    continue;
  }
  try {
    execFileSync(
      "say",
      [
        "-v",
        "Kyoko",
        "-r",
        "150",
        "--output-file",
        file,
        "--file-format=m4af",
        "--data-format=aac",
        card.japanese,
      ],
      { stdio: "pipe" }
    );
    generated++;
    process.stdout.write(`✓ ${card.id}  ${card.japanese}\n`);
  } catch (e) {
    failed++;
    process.stderr.write(`✗ ${card.id}  ${card.japanese}: ${e.message}\n`);
  }
}

console.log(
  `\nDone. Generated: ${generated}, skipped (already existed): ${skipped}, failed: ${failed}`
);
if (failed > 0) process.exit(1);
