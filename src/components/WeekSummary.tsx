import type { CalEvent, TabMode } from "../types";
import { summarize } from "../lib/summary";
import { pickId } from "../lib/picks";

interface Props {
  events: CalEvent[];
  tab: TabMode;
  picks: Set<string>;
}

export function WeekSummary({ events, tab, picks }: Props) {
  const { count, formattedCost, makingCount, makingRatio } = summarize(events);
  if (count === 0) return null;
  const pickedInWeek = events.filter((e) => picks.has(pickId(e)));
  const pickedCount = pickedInWeek.length;
  const pickedSummary = pickedCount > 0 ? summarize(pickedInWeek) : null;
  const makeClass =
    makingRatio >= 40
      ? "week-summary-make-hi"
      : makingRatio >= 20
        ? "week-summary-make-mid"
        : "week-summary-make-lo";
  return (
    <div className="week-summary">
      <span className="week-summary-chip">
        {count} event{count === 1 ? "" : "s"}
      </span>
      <span className="week-summary-chip">{formattedCost}</span>
      {tab === "all" ? (
        <span className={`week-summary-chip ${makeClass}`}>
          {makingCount} making · {makingRatio}%
        </span>
      ) : null}
      {pickedSummary ? (
        <span
          className="week-summary-chip week-summary-picks"
          title={`${pickedCount} picked · ${pickedSummary.formattedCost}`}
        >
          ★ {pickedCount} · {pickedSummary.formattedCost}
        </span>
      ) : null}
    </div>
  );
}
