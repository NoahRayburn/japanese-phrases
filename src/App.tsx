import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { TabBar, type Tab } from "./components/TabBar";
import { StudyView } from "./components/StudyView";
import { StatsView } from "./components/StatsView";
import { SettingsPanel } from "./components/SettingsPanel";
import { PhrasesView } from "./components/PhrasesView";
import type { AppSettings, AppState, Mode, PhraseCard } from "./types";
import { loadState, recordReview, resetPhrases, saveState } from "./storage";
import {
  getSyncStatus,
  onSyncStatus,
  pushPhrases,
  subscribePhrases,
  type SyncStatus,
} from "./cloudSync";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>("say");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    getSyncStatus()
  );

  // Track whether the current state.phrases change came from a remote
  // snapshot — if so, don't push it back up (would cause a feedback loop).
  const isRemoteUpdate = useRef(false);
  // Latest state, accessible inside the long-lived subscribe callback
  // without re-subscribing on every state change.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Persist on every state change (localStorage).
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Subscribe to remote phrase updates once.
  useEffect(() => {
    const unsubStatus = onSyncStatus(setSyncStatus);
    const unsubPhrases = subscribePhrases((snap) => {
      if (snap.exists) {
        // Remote has data — adopt it locally.
        isRemoteUpdate.current = true;
        setState((s) => ({ ...s, phrases: snap.phrases }));
      } else {
        // Remote is empty (first run on this Firestore project) —
        // seed it from local.
        pushPhrases(stateRef.current.phrases);
      }
    });
    return () => {
      unsubStatus();
      unsubPhrases();
    };
  }, []);

  // Push local phrase changes to the cloud (skip if change came from remote).
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    pushPhrases(state.phrases);
  }, [state.phrases]);

  const handleGrade = useCallback(
    (cardId: string, mode: Mode, correct: boolean) => {
      setState((s) => recordReview(s, cardId, mode, correct));
    },
    []
  );

  const handleSettingsChange = useCallback((settings: AppSettings) => {
    setState((s) => ({ ...s, settings }));
  }, []);

  const handlePhrasesChange = useCallback((phrases: PhraseCard[]) => {
    setState((s) => ({ ...s, phrases }));
  }, []);

  const handleResetPhrases = useCallback(() => {
    setState((s) => resetPhrases(s));
  }, []);

  // Keyboard shortcuts: 1/2/3/4/5 to switch tabs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "1") setTab("say");
      else if (e.key === "2") setTab("hear");
      else if (e.key === "3") setTab("read");
      else if (e.key === "4") setTab("stats");
      else if (e.key === "5") setTab("phrases");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-full max-w-2xl mx-auto bg-slate-50 dark:bg-slate-900 dark:text-slate-100 flex flex-col">
      <Header
        tripDate={state.settings.tripDate}
        syncStatus={syncStatus}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="flex-1">
        {tab === "stats" ? (
          <StatsView state={state} />
        ) : tab === "phrases" ? (
          <PhrasesView
            phrases={state.phrases}
            onChange={handlePhrasesChange}
            onResetDefaults={handleResetPhrases}
          />
        ) : (
          <StudyView mode={tab} state={state} onGrade={handleGrade} />
        )}
      </main>
      {settingsOpen && (
        <SettingsPanel
          settings={state.settings}
          syncStatus={syncStatus}
          onChange={handleSettingsChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
