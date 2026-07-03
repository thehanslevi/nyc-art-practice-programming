import decisionsData from "../data/decisions.json";
import type { DecisionsData } from "../types";

const data = decisionsData as DecisionsData;

export function Decisions() {
  if (data.open.length === 0) return null;
  return (
    <section className="decisions" aria-label="Open decisions">
      <h2 className="decisions-title">Open decisions</h2>
      <ol className="decisions-list">
        {data.open.map((item, idx) => (
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
      </ol>
    </section>
  );
}
