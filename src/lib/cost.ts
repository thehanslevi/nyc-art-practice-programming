import type { CalEvent } from "../types";

export function isFree(event: Pick<CalEvent, "cost">): boolean {
  const c = event.cost.trim().toUpperCase();
  if (c === "FREE") return true;
  if (c.startsWith("FREE ")) return true; // "FREE (donation)", "FREE RSVP", etc.
  if (c === "$0" || c === "$0.00") return true;
  return false;
}
