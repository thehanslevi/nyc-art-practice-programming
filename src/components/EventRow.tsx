import type { CalEvent } from "../types";

interface Props {
  event: CalEvent;
}

function flagLabel(flag: CalEvent["flag"]): string | null {
  if (flag === "urgent") return "buy now";
  if (flag === "decide") return "decide";
  if (flag === "priority") return "★";
  return null;
}

export function EventRow({ event }: Props) {
  const label = flagLabel(event.flag);
  const isFree = event.cost.toUpperCase() === "FREE";

  return (
    <div className={`event-row cat-${event.category}`}>
      <div className="event-day">
        <span className="event-day-name">{event.day}</span>
        <span>{event.date}</span>
      </div>
      <div className="event-main">
        <div className="event-title">
          {event.url ? (
            <a href={event.url} target="_blank" rel="noreferrer">
              {event.event}
            </a>
          ) : (
            event.event
          )}
        </div>
        {event.note ? <div className="event-note">{event.note}</div> : null}
        <div className="event-where">{event.where}</div>
      </div>
      <div className={`event-cost${isFree ? " free" : ""}`}>{event.cost}</div>
      <span className={`pill pill-${event.category}`}>{event.category}</span>
      {label ? (
        <span className={`flag flag-${event.flag}`}>{label}</span>
      ) : (
        <span />
      )}
    </div>
  );
}
