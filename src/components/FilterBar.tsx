import type { CategoryFilter } from "../types";

interface Props {
  active: CategoryFilter;
  onChange: (next: CategoryFilter) => void;
}

const OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sound", label: "Sound" },
  { value: "dance", label: "Dance" },
  { value: "film", label: "Film" },
  { value: "tech", label: "Tech" },
  { value: "make", label: "Make" },
  { value: "stage", label: "Stage" },
  { value: "word", label: "Word" },
  { value: "circle", label: "Circle" },
];

export function FilterBar({ active, onChange }: Props) {
  return (
    <div className="filter-bar" role="tablist" aria-label="Category filter">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={active === opt.value}
          className={`filter-btn${active === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
