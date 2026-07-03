const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const YEAR = 2026;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseEventDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const m = MONTHS[parts[0] ?? ""];
  const d = Number(parts[1]);
  if (m === undefined || Number.isNaN(d)) return null;
  return new Date(YEAR, m, d);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function daysUntil(target: Date, from: Date = today()): number {
  return daysBetween(from, target);
}

export function isPast(target: Date, from: Date = today()): boolean {
  return daysUntil(target, from) < 0;
}

export function formatDaysUntil(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    if (abs === 1) return "yesterday";
    if (abs < 7) return `${abs}d ago`;
    if (abs < 30) return `${Math.round(abs / 7)}w ago`;
    return "past";
  }
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days}d`;
  if (days < 30) return `in ${Math.round(days / 7)}w`;
  return `in ${Math.round(days / 30)}mo`;
}

// A week label like "Jul 6–12" or "Aug 24–30" or "Aug 10–23" or spans month like "Jul 27–Aug 2".
export function parseWeekRange(
  label: string,
): { start: Date; end: Date } | null {
  const cleaned = label.replace("–", "-").replace("—", "-");
  const m = cleaned.match(/^(\w{3})\s+(\d+)-(?:(\w{3})\s+)?(\d+)$/);
  if (!m) return null;
  const [, m1, d1, m2, d2] = m;
  const startMonth = MONTHS[m1 ?? ""];
  const endMonth = m2 ? MONTHS[m2 ?? ""] : startMonth;
  if (startMonth === undefined || endMonth === undefined) return null;
  return {
    start: new Date(YEAR, startMonth, Number(d1)),
    end: new Date(YEAR, endMonth, Number(d2)),
  };
}

export function isCurrentWeek(
  range: { start: Date; end: Date },
  from: Date = today(),
): boolean {
  return from >= range.start && from <= range.end;
}

export function isPastWeek(
  range: { start: Date; end: Date },
  from: Date = today(),
): boolean {
  return range.end < from;
}
