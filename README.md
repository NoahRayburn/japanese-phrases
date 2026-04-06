# Japanese Phrase Learner

Personal flash-card app for trip prep. Vite + React + TypeScript + Tailwind, with pre-generated TTS audio (no API keys), PWA-installable for offline use, and optional Firestore sync so phrase edits ripple across all your devices.

## Local development

```bash
npm install
npm run generate-audio    # macOS only — uses `say -v Kyoko` to generate audio for every card
npm run dev
```

## Audio

Audio is generated at build time using macOS `say -v Kyoko`. Files land in `public/audio/<id>.m4a` and are committed to the repo so the GitHub Pages deploy is self-contained.

To install Kyoko: **System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → Japanese → Kyoko (Enhanced)**.

If a card's audio file is missing (new cards you've added in-app), the app falls back to the browser's Web Speech API.

## Cross-device sync (optional, recommended)

Phrase edits sync across devices via Firestore. Stats and review history stay 100% local — they're never sent to the cloud.

### One-time Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project** (free tier, no card needed).
2. Inside the project, click the `</>` icon to **Add a web app**, register it (any nickname). Copy the `firebaseConfig` object.
3. In the left sidebar: **Build → Firestore Database → Create database → Start in test mode → pick a region close to you**.
4. Go to **Firestore → Rules** and paste:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /jp-learner/{doc} {
         allow read, write: if true;
       }
     }
   }
   ```
   Click **Publish**. This makes the single `jp-learner` collection world-read/writable, which is fine for a personal app on an obscure URL with non-sensitive phrase data.

### Local development with sync

Copy `.env.example` to `.env.local` and fill in the four `VITE_FIREBASE_*` values from step 2. Run `npm run dev` — the header dot should turn green.

### Production / GitHub Pages

Add the same four values as **repository secrets** in GitHub:

**Repo → Settings → Secrets and variables → Actions → New repository secret**

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Then enable Pages: **Settings → Pages → Source → GitHub Actions**.

Push to `main` and the workflow at `.github/workflows/deploy.yml` will build (with secrets injected at build time) and deploy. Live URL: `https://<your-username>.github.io/japanese-phrases/`.

## Adding or editing cards

Use the **List** tab in the app — add, edit, delete, search, all per-mode. Changes sync via Firestore (if configured) and are immediately reflected on every connected device.

If you want native Kyoko audio for new cards (instead of the browser TTS fallback), edit `src/data/phrases.json` directly, run `npm run generate-audio`, commit, and push.

## Keyboard shortcuts

- `1` / `2` / `3` / `4` / `5` — switch tabs (Say / Hear / Read / Stats / List)

## What syncs and what doesn't

| Data | Where it lives |
|---|---|
| Phrases (the deck) | Firestore + localStorage cache |
| Reviews / accuracy / mastery | localStorage (per device) |
| Settings (trip date, speech rate, romaji toggle) | localStorage (per device) |
