import { useEffect, useState } from "react";
import spacesData from "../data/spaces.json";
import type { Category, CategoryFilter, Space, TabMode } from "../types";
import { matchesTab } from "../lib/tab";

const data = spacesData as Space[];
const STORAGE_KEY = "nyc-cal:spaces-expanded:v1";

interface Props {
  filter: CategoryFilter;
  tab: TabMode;
}

const CATEGORY_LABELS: Record<Category, string> = {
  sound: "Sound",
  dance: "Dance",
  film: "Film",
  tech: "Tech",
  making: "Making",
  theatre: "Theatre",
  literature: "Literature",
  community: "Community",
};

function loadExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveExpanded(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    /* ignore */
  }
}

export function Spaces({ filter, tab }: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(loadExpanded());
  }, []);

  useEffect(() => {
    saveExpanded(expanded);
  }, [expanded]);

  const visible = data
    .filter((s) => filter === "all" || s.category === filter)
    .filter((s) => matchesTab(tab, s.mode));

  if (visible.length === 0) return null;

  const heading =
    tab === "attend" ? "Places to see things" : "Places to make things";

  const byCategory = new Map<Category, number>();
  for (const s of visible) {
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1);
  }
  const categoryBreakdown = Array.from(byCategory.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <section className="spaces" aria-label={heading}>
      <button
        type="button"
        className="spaces-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="spaces-toggle-left">
          <span className="spaces-toggle-caret">{expanded ? "▾" : "▸"}</span>
          <span className="spaces-toggle-title">{heading}</span>
          <span className="spaces-toggle-count">{visible.length}</span>
        </span>
        {!expanded ? (
          <span className="spaces-toggle-breakdown">
            {categoryBreakdown.map(([cat, count]) => (
              <span key={cat} className={`spaces-dot cat-${cat}`}>
                <span className="spaces-dot-mark" />
                {CATEGORY_LABELS[cat]} {count}
              </span>
            ))}
          </span>
        ) : null}
      </button>
      {expanded ? (
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
      ) : null}
    </section>
  );
}
