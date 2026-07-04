import eventsData from "../data/events.json";
import type { CalEvent, CategoryFilter, EventsData, TabMode } from "../types";
import { isFree } from "../lib/cost";
import { downloadICal } from "../lib/ical";
import { pickId } from "../lib/picks";
import { matchesTab } from "../lib/tab";

const data = eventsData as EventsData;

interface Props {
  filter: CategoryFilter;
  tab: TabMode;
  picks: Set<string>;
  picksOnly: boolean;
  freeOnly: boolean;
}

function visibleEvents(
  filter: CategoryFilter,
  tab: TabMode,
  picks: Set<string>,
  picksOnly: boolean,
  freeOnly: boolean,
): CalEvent[] {
  return data.weeks
    .flatMap((w) => w.events as CalEvent[])
    .filter((e) => filter === "all" || e.category === filter)
    .filter((e) => matchesTab(tab, e.mode))
    .filter((e) => !picksOnly || picks.has(pickId(e)))
    .filter((e) => !freeOnly || isFree(e));
}

export function ExportButton({ filter, tab, picks, picksOnly, freeOnly }: Props) {
  const events = visibleEvents(filter, tab, picks, picksOnly, freeOnly);
  const bits = [
    picksOnly ? "picks" : tab === "all" ? null : tab,
    filter === "all" ? null : filter,
    freeOnly ? "free" : null,
  ].filter(Boolean);
  const scopeText = bits.length ? ` ${bits.join(" ")}` : "";
  const label = `Export ${events.length}${scopeText}`;
  const filename = `nyc-creative-calendar${bits.length ? "-" + bits.join("-") : ""}.ics`;
  return (
    <button
      type="button"
      className="export-btn"
      onClick={() => downloadICal(events, filename)}
      disabled={events.length === 0}
      title="Download .ics — import to Apple Calendar or Google Calendar"
    >
      {label} ↓
    </button>
  );
}
