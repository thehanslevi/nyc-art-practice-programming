import eventsData from "../data/events.json";
import type { CalEvent, EventsData } from "../types";
import type { Practice } from "../types/practice";
import { isPast, parseEventDate } from "./dates";

const ALL: CalEvent[] = (eventsData as EventsData).weeks.flatMap(
  (w) => w.events as CalEvent[],
);

/**
 * The bridge between the two models.
 *
 * The Directory holds standing patterns: "8-week sessions", "check site".
 * events.json holds dated instances: "Optical Printing Day 1, Jul 18". They
 * describe the same venues at different resolutions, so a Practice row can
 * borrow its venue's next real date instead of saying "check site".
 *
 * Only make-mode events count. Pioneer Works runs concerts as well as open
 * studios, and a making directory should not advertise False Harmonics as your
 * next session there.
 */
function matchesVenue(p: Practice, e: CalEvent): boolean {
  const name = p.name.toLowerCase();
  const title = e.event.toLowerCase();
  // Short names are ambiguous inside a free-text venue string ("JACK" would
  // catch "Jack's Bar"), so they must lead the title with a colon.
  if (name.length <= 5) return title.startsWith(name + ":");
  return title.startsWith(name) || e.where.toLowerCase().includes(name);
}

/** Upcoming dated making sessions at this venue, soonest first. */
export function datedSessionsFor(p: Practice, now: Date): CalEvent[] {
  return ALL.filter((e) => e.mode === "make" && matchesVenue(p, e))
    .map((e) => ({ e, d: parseEventDate(e.date) }))
    .filter((x) => x.d && !isPast(x.d, now))
    .sort((a, b) => a.d!.getTime() - b.d!.getTime())
    .map((x) => x.e);
}

/** Strip the venue prefix: "Mono No Aware: Optical Printing" -> "Optical Printing". */
export function sessionTitle(p: Practice, e: CalEvent): string {
  const prefix = p.name + ":";
  return e.event.toLowerCase().startsWith(prefix.toLowerCase())
    ? e.event.slice(prefix.length).trim()
    : e.event;
}
