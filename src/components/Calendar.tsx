import eventsData from "../data/events.json";
import type { CategoryFilter, EventsData } from "../types";
import { EventRow } from "./EventRow";

const data = eventsData as EventsData;

interface Props {
  filter: CategoryFilter;
}

export function Calendar({ filter }: Props) {
  return (
    <div className="calendar">
      {data.weeks.map((week) => {
        const visible =
          filter === "all"
            ? week.events
            : week.events.filter((e) => e.category === filter);
        if (visible.length === 0) return null;
        return (
          <section key={week.label} className="week">
            <h3 className="week-header">{week.label}</h3>
            {visible.map((event, idx) => (
              <EventRow
                key={`${event.date}-${event.event}-${idx}`}
                event={event}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
