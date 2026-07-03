import anchorsData from "../data/anchors.json";
import type { Anchor } from "../types";

const data = anchorsData as Anchor[];

export function Anchors() {
  if (data.length === 0) return null;
  return (
    <section className="band band-warn" aria-label="Weekly anchors">
      <h2 className="band-title">Weekly anchors</h2>
      <ul className="band-list">
        {data.map((anchor) => (
          <li key={anchor.name}>
            <span className="anchor-name">
              {anchor.url ? (
                <a href={anchor.url} target="_blank" rel="noreferrer">
                  {anchor.name}
                </a>
              ) : (
                anchor.name
              )}
            </span>{" "}
            <span className="anchor-desc">— {anchor.description}. {anchor.note}.</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
