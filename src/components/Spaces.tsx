import spacesData from "../data/spaces.json";
import type { CategoryFilter, Space } from "../types";

const data = spacesData as Space[];

interface Props {
  filter: CategoryFilter;
}

export function Spaces({ filter }: Props) {
  const visible =
    filter === "all" ? data : data.filter((s) => s.category === filter);
  if (visible.length === 0) return null;
  return (
    <section className="spaces" aria-label="Places to make things">
      <h2 className="spaces-title">Places to make things</h2>
      <p className="spaces-lede">
        Ongoing participatory spaces — not one-off events. Drop in when the
        calendar is quiet.
      </p>
      <ul className="spaces-list">
        {visible.map((s) => (
          <li key={s.name} className={`space cat-${s.category}`}>
            <div className="space-head">
              <span className="space-name">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                ) : (
                  s.name
                )}
              </span>
              <span className={`pill pill-${s.category}`}>{s.category}</span>
            </div>
            <div className="space-desc">{s.description}</div>
            <div className="space-note">{s.note}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
