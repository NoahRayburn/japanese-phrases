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
  Timestamp,
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
  /** ms epoch — 0 if the doc doesn't exist yet or has no timestamp. */
  updatedAt: number;
}

function extractUpdatedAt(raw: unknown): number {
  if (!raw) return 0;
  if (raw instanceof Timestamp) return raw.toMillis();
  // Server-assigned timestamps appear as plain objects on the initial client
  // write before the server round-trip; fall back to 0 so we don't clobber
  // the local value.
  return 0;
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
        // Prefer the client-provided `localUpdatedAt` number (immediately
        // available on the originating device's snapshot) and fall back to
        // Firestore's server timestamp for older documents.
        const updatedAt =
          typeof data.localUpdatedAt === "number"
            ? data.localUpdatedAt
            : extractUpdatedAt(data.updatedAt);
        onChange({
          exists: true,
          phrases: data.phrases as PhraseCard[],
          updatedAt,
        });
      } else {
        onChange({ exists: false, phrases: [], updatedAt: 0 });
      }
    },
    (err) => {
      console.error("Firestore subscribe error", err);
      setStatus("error");
    }
  );
}

/**
 * Push phrases immediately (no debounce). The local `updatedAt` ms epoch is
 * stored alongside the array so the receiving client knows the ordering even
 * before Firestore's serverTimestamp round-trips.
 */
export async function pushPhrases(
  phrases: PhraseCard[],
  localUpdatedAt: number
): Promise<void> {
  if (!ensureInit() || !db) return;
  try {
    await setDoc(doc(db, COLLECTION, DOC_ID), {
      phrases,
      updatedAt: serverTimestamp(),
      localUpdatedAt,
    });
  } catch (e) {
    console.error("Firestore push error", e);
    setStatus("error");
  }
}
