import eventsData from "../data/events.json";
import type { CalEvent, CategoryFilter, EventsData, TabMode } from "../types";
import { downloadICal } from "../lib/ical";
import { pickId } from "../lib/picks";
import { matchesTab } from "../lib/tab";

const data = eventsData as EventsData;

interface Props {
  filter: CategoryFilter;
  tab: TabMode;
  picks: Set<string>;
  picksOnly: boolean;
}

function visibleEvents(
  filter: CategoryFilter,
  tab: TabMode,
  picks: Set<string>,
  picksOnly: boolean,
): CalEvent[] {
  return data.weeks
    .flatMap((w) => w.events as CalEvent[])
    .filter((e) => filter === "all" || e.category === filter)
    .filter((e) => matchesTab(tab, e.mode))
    .filter((e) => !picksOnly || picks.has(pickId(e)));
}

export function ExportButton({ filter, tab, picks, picksOnly }: Props) {
  const events = visibleEvents(filter, tab, picks, picksOnly);
  const bits = [
    picksOnly ? "picks" : tab === "all" ? null : tab,
    filter === "all" ? null : filter,
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
