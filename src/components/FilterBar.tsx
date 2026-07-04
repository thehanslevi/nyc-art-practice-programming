import type { Category, CategoryFilter } from "../types";

interface Props {
  active: CategoryFilter;
  onChange: (next: CategoryFilter) => void;
  counts?: Record<CategoryFilter, number>;
}

const OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sound", label: "Sound" },
  { value: "dance", label: "Dance" },
  { value: "film", label: "Film" },
  { value: "tech", label: "Tech" },
  { value: "making", label: "Making" },
  { value: "theatre", label: "Theatre" },
  { value: "word", label: "Word" },
  { value: "community", label: "Community" },
];

export function FilterBar({ active, onChange, counts }: Props) {
  return (
    <div className="filter-bar" role="tablist" aria-label="Category filter">
      {OPTIONS.map((opt) => {
        const count = counts ? counts[opt.value] : undefined;
        if (opt.value !== "all" && count === 0) return null;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active === opt.value}
            className={`filter-btn${active === opt.value ? " active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
            {typeof count === "number" && opt.value !== "all" ? (
              <span className="filter-count">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function computeCategoryCounts<T extends { category: Category }>(
  events: T[],
): Record<CategoryFilter, number> {
  const counts: Record<CategoryFilter, number> = {
    all: events.length,
    sound: 0,
    dance: 0,
    film: 0,
    tech: 0,
    making: 0,
    theatre: 0,
    word: 0,
    community: 0,
  };
  for (const e of events) counts[e.category] += 1;
  return counts;
}
