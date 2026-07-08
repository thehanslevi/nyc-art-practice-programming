import type { CalEvent } from "../types";
import { formatDaysUntil } from "../lib/dates";
import { formatCost } from "../lib/cost";

interface Props {
  event: CalEvent;
  daysUntil?: number | null;
  past?: boolean;
  picked?: boolean;
  onTogglePick?: () => void;
}

function flagLabel(flag: CalEvent["flag"]): string | null {
  if (flag === "urgent") return "buy now";
  if (flag === "decide") return "decide";
  if (flag === "priority") return "★";
  return null;
}

function formatTime(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === "00" ? `${h12}${suffix}` : `${h12}:${m}${suffix}`;
}

function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  if (!end) return formatTime(start);
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function EventRow({
  event,
  daysUntil,
  past = false,
  picked = false,
  onTogglePick,
}: Props) {
  const label = flagLabel(event.flag);
  const cost = formatCost(event.cost);
  const timeStr = formatTimeRange(event.start, event.end);
  const countdown =
    typeof daysUntil === "number" ? formatDaysUntil(daysUntil) : null;
  const countdownClass =
    typeof daysUntil === "number"
      ? daysUntil < 0
        ? "countdown-past"
        : daysUntil === 0
          ? "countdown-today"
          : daysUntil <= 3
            ? "countdown-soon"
            : "countdown-far"
      : "";

  return (
    <div
      className={`event-row cat-${event.category}${past ? " is-past" : ""}${picked ? " is-picked" : ""}`}
    >
      {onTogglePick ? (
        <button
          type="button"
          className={`pick-btn${picked ? " picked" : ""}`}
          onClick={onTogglePick}
          aria-label={picked ? "Remove from picks" : "Add to picks"}
          aria-pressed={picked}
          title={picked ? "Remove from picks" : "Add to picks"}
        >
          {picked ? "★" : "☆"}
        </button>
      ) : null}
      <div className="event-day">
        <span className="event-day-name">{event.day}</span>
        <span>{event.date}</span>
        {timeStr ? <span className="event-time">{timeStr}</span> : null}
        {countdown ? (
          <span className={`countdown ${countdownClass}`}>{countdown}</span>
        ) : null}
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
        <div className="event-where">{event.where}</div>
        {event.pick && event.pickNote ? (
          <div className="event-picknote">{event.pickNote}</div>
        ) : null}
      </div>
      {cost ? (
        <div className={`event-cost cost-${cost.kind}`}>{cost.text}</div>
      ) : (
        <span />
      )}
      <span className={`pill pill-${event.category}`}>{event.category}</span>
      {label ? (
        <span className={`flag flag-${event.flag}`}>{label}</span>
      ) : (
        <span />
      )}
    </div>
  );
}
