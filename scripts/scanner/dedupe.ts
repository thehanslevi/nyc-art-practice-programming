import type { CalEvent, EventsData } from "../../src/types";

// Fuzzy duplicate detection shared by the scanner gates, the merge step,
// and scripts/dedupe-events.ts. Two entries are "likely the same event"
// when they share a date and their titles overlap heavily once venue
// words are stripped — so "Dixon Place: FOOGA!" matches "FOOGA!" — or
// they share venue + start time with moderate title overlap.

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "at", "on", "in", "of", "to", "for",
  "with", "by", "from", "as", "is", "are", "was", "were", "presents",
]);

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, " ") // stray HTML entities from scrapes
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(norm(s).split(" ").filter((t) => t && !STOP_WORDS.has(t)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** Title tokens minus the venue's own words. */
function strippedTitleTokens(e: Pick<CalEvent, "event" | "where">): Set<string> {
  const t = tokens(e.event);
  for (const v of tokens(e.where)) t.delete(v);
  return t;
}

export function isLikelyDuplicate(a: CalEvent, b: CalEvent): boolean {
  if (a.date !== b.date) return false;
  const sim = jaccard(strippedTitleTokens(a), strippedTitleTokens(b));
  if (sim >= 0.6) return true;
  const va = norm(a.where);
  const vb = norm(b.where);
  const sameVenue = va !== "" && va.slice(0, 18) === vb.slice(0, 18);
  const sameStart = !!a.start && a.start === b.start;
  return sameVenue && sameStart && sim >= 0.3;
}

/** First existing event the candidate duplicates, or null. */
export function findDuplicateOf(
  candidate: CalEvent,
  existing: CalEvent[],
): CalEvent | null {
  for (const e of existing) {
    if (isLikelyDuplicate(candidate, e)) return e;
  }
  return null;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function dayNumber(dateStr: string, year: number): number | null {
  const parts = dateStr.trim().split(/\s+/);
  const m = MONTHS[parts[0] ?? ""];
  const d = Number(parts[1]);
  if (m === undefined || Number.isNaN(d)) return null;
  return Math.round(new Date(year, m, d).getTime() / 86400000);
}

/**
 * Collapse dense performance runs (same show, same venue, night after
 * night — e.g. a 24-date theatre run) into a single entry annotated with
 * the run's end date. Recurring series with weekly+ spacing are left
 * alone: collapse requires ≥4 dates with a median gap of ≤3 days.
 */
export function collapseRuns(
  data: EventsData,
  year: number,
): { data: EventsData; collapsed: { kept: CalEvent; dropped: number }[] } {
  interface Ref { week: number; idx: number; e: CalEvent; t: number }
  const groups = new Map<string, Ref[]>();
  data.weeks.forEach((w, wi) =>
    w.events.forEach((e, ei) => {
      const t = dayNumber(e.date, year);
      if (t === null) return;
      const titleKey = Array.from(
        // reuse the venue-stripped tokens so "Venue: Title" groups with "Title"
        (() => {
          const tok = tokens(e.event);
          for (const v of tokens(e.where)) tok.delete(v);
          return tok;
        })(),
      )
        .sort()
        .join(" ");
      if (!titleKey) return;
      const key = `${titleKey}|${norm(e.where).slice(0, 18)}`;
      const arr = groups.get(key) ?? [];
      arr.push({ week: wi, idx: ei, e: e as CalEvent, t });
      groups.set(key, arr);
    }),
  );

  const remove = new Map<number, Set<number>>();
  const collapsed: { kept: CalEvent; dropped: number }[] = [];
  for (const refs of groups.values()) {
    const uniqueDays = Array.from(new Set(refs.map((r) => r.t))).sort(
      (a, b) => a - b,
    );
    if (uniqueDays.length < 4) continue;
    const gaps = uniqueDays.slice(1).map((d, i) => d - uniqueDays[i]!);
    const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)]!;
    if (median > 3) continue;

    const ordered = [...refs].sort((a, b) => a.t - b.t);
    const keep = ordered[0]!;
    const last = ordered[ordered.length - 1]!;
    const runNote = `Runs through ${last.e.date} (${uniqueDays.length} dates)`;
    // Idempotent: a collapsed run gets re-scraped and re-collapsed on later
    // scans, so replace any prior "Runs through …" note rather than append.
    const priorNote = (keep.e.note ?? "")
      .replace(/\s*·?\s*Runs through [^·]*\(\d+ dates\)/g, "")
      .trim();
    keep.e.note = priorNote ? `${priorNote} · ${runNote}` : runNote;
    for (const r of ordered.slice(1)) {
      const s = remove.get(r.week) ?? new Set<number>();
      s.add(r.idx);
      remove.set(r.week, s);
    }
    collapsed.push({ kept: keep.e, dropped: ordered.length - 1 });
  }

  if (collapsed.length === 0) return { data, collapsed };
  const weeks = data.weeks
    .map((w, wi) => ({
      ...w,
      events: w.events.filter((_, ei) => !remove.get(wi)?.has(ei)),
    }))
    .filter((w) => w.events.length > 0);
  return { data: { ...data, weeks }, collapsed };
}
