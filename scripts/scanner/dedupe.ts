import type { CalEvent } from "../../src/types";

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
