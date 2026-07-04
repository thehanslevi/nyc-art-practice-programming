import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import eventsData from "./data/events.json";
import type {
  CalEvent,
  CategoryFilter,
  EventsData,
  TabMode,
} from "./types";
import { today } from "./lib/dates";
import { loadPicks, pickId, savePicks } from "./lib/picks";
import {
  fetchPicks,
  loadPassphrase,
  savePassphrase,
  uploadPicks,
} from "./lib/sync";
import { matchesTab } from "./lib/tab";
import { Calendar } from "./components/Calendar";
import { ExportButton } from "./components/ExportButton";
import { FilterBar, computeCategoryCounts } from "./components/FilterBar";
import { Spaces } from "./components/Spaces";
import { SubscribePanel } from "./components/SubscribePanel";
import { SyncPanel, type SyncStatus } from "./components/SyncPanel";
import { TabBar } from "./components/TabBar";

const data = eventsData as EventsData;
const ALL_EVENTS: CalEvent[] = data.weeks.flatMap((w) => w.events as CalEvent[]);

const TODAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const UPLOAD_DEBOUNCE_MS = 1500;

function App() {
  const [tab, setTab] = useState<TabMode>("all");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [picksOnly, setPicksOnly] = useState(false);
  const [picks, setPicks] = useState<Set<string>>(() => loadPicks());
  const [passphrase, setPassphrase] = useState<string | null>(() => loadPassphrase());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: "idle" });
  const todayLabel = useMemo(() => TODAY_FMT.format(today()), []);
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextUpload = useRef(false);

  useEffect(() => {
    savePicks(picks);
  }, [picks]);

  useEffect(() => {
    if (!passphrase) return;
    let cancelled = false;
    (async () => {
      setSyncStatus({ kind: "syncing" });
      try {
        const remote = await fetchPicks(passphrase);
        if (cancelled) return;
        if (remote && remote.length > 0) {
          const merged = new Set<string>([...loadPicks(), ...remote]);
          skipNextUpload.current = true;
          setPicks(merged);
          await uploadPicks(passphrase, Array.from(merged));
        } else {
          const local = Array.from(loadPicks());
          await uploadPicks(passphrase, local);
        }
        if (!cancelled) setSyncStatus({ kind: "synced", at: new Date() });
      } catch (err) {
        if (!cancelled) {
          setSyncStatus({
            kind: "error",
            message: err instanceof Error ? err.message : "Sync failed",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [passphrase]);

  useEffect(() => {
    if (!passphrase) return;
    if (skipNextUpload.current) {
      skipNextUpload.current = false;
      return;
    }
    if (uploadTimer.current) clearTimeout(uploadTimer.current);
    uploadTimer.current = setTimeout(async () => {
      setSyncStatus({ kind: "syncing" });
      try {
        await uploadPicks(passphrase, Array.from(picks));
        setSyncStatus({ kind: "synced", at: new Date() });
      } catch (err) {
        setSyncStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Sync failed",
        });
      }
    }, UPLOAD_DEBOUNCE_MS);
    return () => {
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
    };
  }, [picks, passphrase]);

  const togglePick = useCallback((id: string) => {
    setPicks((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSetPassphrase = useCallback(async (next: string | null) => {
    savePassphrase(next);
    setPassphrase(next);
    if (next === null) {
      setSyncStatus({ kind: "idle" });
    }
  }, []);

  const handleSyncNow = useCallback(async () => {
    if (!passphrase) return;
    setSyncStatus({ kind: "syncing" });
    try {
      const remote = await fetchPicks(passphrase);
      const local = new Set(loadPicks());
      if (remote) {
        for (const p of remote) local.add(p);
      }
      const arr = Array.from(local);
      await uploadPicks(passphrase, arr);
      skipNextUpload.current = true;
      setPicks(local);
      setSyncStatus({ kind: "synced", at: new Date() });
    } catch (err) {
      setSyncStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }, [passphrase]);

  const counts = useMemo(() => {
    const scoped = ALL_EVENTS.filter((e) => matchesTab(tab, e.mode)).filter(
      (e) => !picksOnly || picks.has(pickId(e)),
    );
    return computeCategoryCounts(scoped);
  }, [tab, picks, picksOnly]);

  const pickCount = picks.size;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1 className="app-title">NYC Art Practice &amp; Programming Calendar</h1>
            <p className="app-subtitle">
              Summer–Fall 2026 — classes, studios, shows across NYC.
            </p>
            <p className="verified">
              Today {todayLabel} · last verified {data.lastVerified}
            </p>
          </div>
          <div className="header-actions">
            <SubscribePanel />
            <SyncPanel
              passphrase={passphrase}
              onSet={handleSetPassphrase}
              onSyncNow={handleSyncNow}
              status={syncStatus}
            />
          </div>
        </div>
      </header>
      <TabBar active={tab} onChange={setTab} />
      <div className="filter-row">
        <FilterBar active={filter} onChange={setFilter} counts={counts} />
        <button
          type="button"
          className={`picks-toggle${picksOnly ? " active" : ""}`}
          onClick={() => setPicksOnly((v) => !v)}
          aria-pressed={picksOnly}
          disabled={pickCount === 0 && !picksOnly}
          title={
            pickCount === 0
              ? "No picks yet"
              : picksOnly
                ? "Show all events"
                : "Show only my picks"
          }
        >
          ★ Picks <span>({pickCount})</span>
        </button>
        <ExportButton filter={filter} tab={tab} picks={picks} picksOnly={picksOnly} />
      </div>
      <Calendar
        filter={filter}
        tab={tab}
        picks={picks}
        picksOnly={picksOnly}
        onTogglePick={togglePick}
      />
      <Spaces filter={filter} tab={tab} />
    </div>
  );
}

export default App;
