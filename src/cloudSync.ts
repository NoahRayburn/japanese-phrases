// Optional Firestore-backed phrase sync.
// Only `state.phrases` syncs across devices. Reviews and settings stay local.
//
// To enable: set VITE_FIREBASE_* env vars at build time. If unset, the app
// runs in local-only mode (no errors, just no sync).

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { PhraseCard } from "./types";

export type SyncStatus =
  | "disabled"
  | "connecting"
  | "synced"
  | "offline"
  | "error";

type StatusListener = (s: SyncStatus) => void;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isSyncConfigured = !!(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let status: SyncStatus = isSyncConfigured ? "connecting" : "disabled";
const listeners = new Set<StatusListener>();

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l(status));
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function onSyncStatus(l: StatusListener): () => void {
  listeners.add(l);
  l(status);
  return () => {
    listeners.delete(l);
  };
}

function ensureInit(): boolean {
  if (!isSyncConfigured) return false;
  if (db) return true;
  try {
    app = initializeApp(config);
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Firebase init failed", e);
    setStatus("error");
    return false;
  }
}

const COLLECTION = "jp-learner";
const DOC_ID = "phrases";

export interface RemoteSnapshot {
  exists: boolean;
  phrases: PhraseCard[];
}

export function subscribePhrases(
  onChange: (snap: RemoteSnapshot) => void
): () => void {
  if (!ensureInit() || !db) return () => {};
  const ref = doc(db, COLLECTION, DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      setStatus("synced");
      const data = snap.data();
      if (snap.exists() && data && Array.isArray(data.phrases)) {
        onChange({ exists: true, phrases: data.phrases as PhraseCard[] });
      } else {
        onChange({ exists: false, phrases: [] });
      }
    },
    (err) => {
      console.error("Firestore subscribe error", err);
      setStatus("error");
    }
  );
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPush: PhraseCard[] | null = null;

export function pushPhrases(phrases: PhraseCard[]): void {
  if (!ensureInit() || !db) return;
  pendingPush = phrases;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (!db || !pendingPush) return;
    const payload = pendingPush;
    pendingPush = null;
    try {
      await setDoc(doc(db, COLLECTION, DOC_ID), {
        phrases: payload,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Firestore push error", e);
      setStatus("error");
    }
  }, 600);
}
