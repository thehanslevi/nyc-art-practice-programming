import { useMemo } from "react";
import eventsData from "../data/events.json";
import type { CalEvent, EventsData } from "../types";
import { isPast, parseEventDate, today } from "../lib/dates";
import { formatCost } from "../lib/cost";

const data = eventsData as EventsData;
const ALL: CalEvent[] = data.weeks.flatMap((w) => w.events as CalEvent[]);

// The editorial lede: the curator's hand-marked upcoming picks (events with
// `pick: true`), with a one-line reason. This is the difference between a
// listing and a curation — a few things, chosen, with a point of view.
export function CuratorPicks() {
  const now = useMemo(() => today(), []);
  const picks = useMemo(() => {
    return ALL.filter((e) => e.pick)
      .map((e) => ({ e, d: parseEventDate(e.date) }))
      .filter((x) => x.d && !isPast(x.d, now))
      .sort((a, b) => a.d!.getTime() - b.d!.getTime())
      .slice(0, 6)
      .map((x) => x.e);
  }, [now]);

  if (picks.length === 0) return null;

  return (
    <section className="curator" aria-label="Curator's picks">
      <p className="curator-title">Don't miss</p>
      <ul className="curator-list">
        {picks.map((e) => {
          const cost = formatCost(e.cost);
          return (
            <li key={`${e.date}|${e.event}`} className={`curator-item cat-${e.category}`}>
              <div className="curator-when">
                {e.day} {e.date}
              </div>
              <div className="curator-body">
                <div className="curator-event">
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.event}
                    </a>
                  ) : (
                    e.event
                  )}
                </div>
                {e.pickNote ? (
                  <div className="curator-note">{e.pickNote}</div>
                ) : null}
                <div className="curator-meta">
                  {e.where.split(/[·,]/)[0]?.trim()}
                  {cost ? <span className="curator-cost"> · {cost.text}</span> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
