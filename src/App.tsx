import { useCallback, useEffect, useMemo, useState } from "react";
import eventsData from "./data/events.json";
import type {
  CalEvent,
  CategoryFilter,
  EventsData,
  TabMode,
} from "./types";
import { today } from "./lib/dates";
import { loadPicks, pickId, savePicks } from "./lib/picks";
import { matchesTab } from "./lib/tab";
import { Anchors } from "./components/Anchors";
import { BuyNow } from "./components/BuyNow";
import { Calendar } from "./components/Calendar";
import { Decisions } from "./components/Decisions";
import { ExportButton } from "./components/ExportButton";
import { FallHorizon } from "./components/FallHorizon";
import { FilterBar, computeCategoryCounts } from "./components/FilterBar";
import { Spaces } from "./components/Spaces";
import { TabBar } from "./components/TabBar";

const data = eventsData as EventsData;
const ALL_EVENTS: CalEvent[] = data.weeks.flatMap((w) => w.events as CalEvent[]);

const TODAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function App() {
  const [tab, setTab] = useState<TabMode>("all");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [picksOnly, setPicksOnly] = useState(false);
  const [picks, setPicks] = useState<Set<string>>(() => loadPicks());
  const todayLabel = useMemo(() => TODAY_FMT.format(today()), []);

  useEffect(() => {
    savePicks(picks);
  }, [picks]);

  const togglePick = useCallback((id: string) => {
    setPicks((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
        <h1 className="app-title">NYC Creative Calendar</h1>
        <p className="app-subtitle">
          Summer–Fall 2026 — classes, studios, shows across NYC.
        </p>
        <p className="verified">
          Today {todayLabel} · last verified {data.lastVerified}
        </p>
      </header>
      <TabBar active={tab} onChange={setTab} />
      <BuyNow tab={tab} />
      <Decisions tab={tab} />
      <Anchors tab={tab} />
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
          ★ {picksOnly ? "Picks" : "Picks"} <span>({pickCount})</span>
        </button>
        <ExportButton filter={filter} tab={tab} picks={picks} picksOnly={picksOnly} />
      </div>
      <Spaces filter={filter} tab={tab} />
      <Calendar
        filter={filter}
        tab={tab}
        picks={picks}
        picksOnly={picksOnly}
        onTogglePick={togglePick}
      />
      <FallHorizon tab={tab} />
    </div>
  );
}

export default App;
