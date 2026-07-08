import type { CalEvent } from "../types";

export function isFree(event: Pick<CalEvent, "cost">): boolean {
  const c = event.cost.trim().toUpperCase();
  if (c === "FREE") return true;
  if (c.startsWith("FREE ")) return true; // "FREE (donation)", "FREE RSVP", etc.
  if (c === "$0" || c === "$0.00") return true;
  return false;
}

export type CostKind = "free" | "sliding" | "paid";

// Turn the raw cost string into a legible signal. "TBD"/unknown returns null
// (showing nothing beats a loud, empty token); real prices pass through;
// sliding-scale / PWYW / donation collapse to one honest word.
export function formatCost(
  cost: string,
): { text: string; kind: CostKind } | null {
  const c = cost.trim();
  if (!c) return null;
  const u = c.toUpperCase();
  if (u === "TBD" || u === "UNKNOWN" || u === "N/A") return null;
  if (isFree({ cost })) return { text: "Free", kind: "free" };
  if (/sliding|pay[- ]?what|pwyw|donation|suggested|notaflof/i.test(c)) {
    return { text: "Sliding scale", kind: "sliding" };
  }
  if (c.includes("$")) return { text: c, kind: "paid" };
  return null;
}
