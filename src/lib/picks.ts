import type { CalEvent } from "../types";

const KEY = "nyc-cal:picks:v1";

export function pickId(e: Pick<CalEvent, "date" | "event">): string {
  return `${e.date}|${e.event}`;
}

export function loadPicks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function savePicks(picks: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(picks)));
  } catch {
    /* quota */
  }
}
