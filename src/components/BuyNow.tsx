import decisionsData from "../data/decisions.json";
import type { DecisionsData } from "../types";
import {
  daysUntil as daysUntilFn,
  formatDaysUntil,
  parseEventDate,
  today,
} from "../lib/dates";

const data = decisionsData as DecisionsData;

export function BuyNow() {
  if (data.urgent.length === 0) return null;
  const now = today();
  return (
    <section className="band band-danger" aria-label="Buy now">
      <h2 className="band-title">Buy now</h2>
      <ul className="band-list">
        {data.urgent.map((item, idx) => {
          const d = item.date ? parseEventDate(item.date) : null;
          const du = d ? daysUntilFn(d, now) : null;
          return (
            <li key={idx}>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.text}
                </a>
              ) : (
                item.text
              )}
              {du !== null ? (
                <span
                  className={`countdown-inline ${du <= 3 ? "countdown-soon" : ""}`}
                >
                  {" "}
                  · {formatDaysUntil(du)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
