import fallData from "../data/fall.json";
import type { FallItem } from "../types";

const data = fallData as FallItem[];

export function FallHorizon() {
  if (data.length === 0) return null;
  return (
    <section className="band band-pro" aria-label="Fall horizon">
      <h2 className="band-title">Fall 2026 horizon</h2>
      <ul className="band-list">
        {data.map((item) => (
          <li key={item.title} className="fall-item">
            <span className="fall-title">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </span>
            <span className="fall-detail">{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
