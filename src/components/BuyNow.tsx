import decisionsData from "../data/decisions.json";
import type { DecisionsData } from "../types";

const data = decisionsData as DecisionsData;

export function BuyNow() {
  if (data.urgent.length === 0) return null;
  return (
    <section className="band band-danger" aria-label="Buy now">
      <h2 className="band-title">Buy now</h2>
      <ul className="band-list">
        {data.urgent.map((item, idx) => (
          <li key={idx}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.text}
              </a>
            ) : (
              item.text
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
