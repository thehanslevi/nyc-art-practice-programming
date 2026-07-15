// Health check for src/data/practices.json.
//
//   npx tsx scripts/check-practices.ts           human-readable report
//   npx tsx scripts/check-practices.ts --md      markdown, for a GitHub issue
//
// The Directory is hand-verified on purpose: a scraper cannot tell you that
// Artshack doesn't publish prices, or that Capoeira Luanda moved to Dean St.
// Playground. That judgement is the point of the file.
//
// But part of the chore IS mechanical, and this does that part:
//   - dead links (Artshack's URL 404'd for a week and only turned up by hand)
//   - moved pages (a redirect means the entry points at the wrong URL)
//   - rows nobody has re-checked in a season
//
// It never edits the data. It tells you where to look.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STALE_AFTER_DAYS } from "../src/types/practice.ts";
import type { Practice } from "../src/types/practice.ts";

const MD = process.argv.includes("--md");
const data = JSON.parse(
  readFileSync(resolve("src/data/practices.json"), "utf8"),
) as { lastVerified: string; practices: Practice[] };

type Verdict = "ok" | "dead" | "moved" | "blocked" | "unreachable";

interface Result {
  p: Practice;
  verdict: Verdict;
  detail: string;
}

const UA =
  "Mozilla/5.0 (compatible; ArtCalHealthCheck/1.0; +https://nyc-art-cal.vercel.app)";

async function probe(p: Practice): Promise<Result> {
  const started = p.url;
  try {
    const res = await fetch(started, {
      redirect: "follow",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    const landed = res.url.replace(/\/$/, "");
    const asked = started.replace(/\/$/, "");

    if (res.status === 404 || res.status === 410) {
      return { p, verdict: "dead", detail: `HTTP ${res.status}` };
    }
    // 403/429 usually means a bot wall, not a broken link. A human can still
    // open it, so this is noted rather than treated as a fault.
    if (res.status === 403 || res.status === 429) {
      return { p, verdict: "blocked", detail: `HTTP ${res.status}` };
    }
    if (!res.ok) {
      return { p, verdict: "unreachable", detail: `HTTP ${res.status}` };
    }
    // Ignore bare http->https and www shuffles; report real moves.
    const norm = (u: string) =>
      u.replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (norm(landed) !== norm(asked)) {
      return { p, verdict: "moved", detail: `→ ${landed}` };
    }
    return { p, verdict: "ok", detail: `HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { p, verdict: "unreachable", detail: msg.slice(0, 60) };
  }
}

/** Small pool: 65 venues, mostly tiny nonprofits. Don't hammer them. */
async function pooled<T, R>(
  items: T[],
  size: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

function daysSince(iso: string, now: Date): number {
  const then = new Date(iso + "T00:00:00");
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
}

const now = new Date();
const results = await pooled(data.practices, 6, probe);

const dead = results.filter((r) => r.verdict === "dead");
const moved = results.filter((r) => r.verdict === "moved");
const unreachable = results.filter((r) => r.verdict === "unreachable");
const blocked = results.filter((r) => r.verdict === "blocked");
const stale = data.practices
  .filter((p) => daysSince(p.verifiedOn, now) > STALE_AFTER_DAYS)
  .sort((a, b) => a.verifiedOn.localeCompare(b.verifiedOn));

// Only broken links are actionable. Staleness is reported as context, never as
// a checklist: at any threshold that catches the quarterly cycle, every row
// flags at once, and a 65-item chore list is one you learn to ignore. Per-row
// staleness already shows on the site, in context, where it can be acted on.
const needsAction = dead.length + moved.length + unreachable.length;

if (MD) {
  const lines: string[] = [];
  lines.push(`_${data.practices.length} practices checked ${now.toISOString().slice(0, 10)}._`);
  lines.push("");
  if (needsAction === 0) {
    lines.push("Every link resolves and nothing is past its re-check window. No action needed.");
  }
  const section = (title: string, rs: Result[]) => {
    if (!rs.length) return;
    lines.push(`### ${title}`, "");
    for (const r of rs) {
      lines.push(`- [ ] **${r.p.name}** — ${r.detail}  \n  <${r.p.url}>`);
    }
    lines.push("");
  };
  section("Dead links — the entry points at nothing", dead);
  section("Moved — update the URL", moved);
  section("Unreachable — check by hand, may be transient", unreachable);
  const oldest = [...data.practices].sort((a, b) =>
    a.verifiedOn.localeCompare(b.verifiedOn),
  )[0];
  lines.push("### Freshness", "");
  if (stale.length) {
    lines.push(
      `${stale.length} of ${data.practices.length} rows haven't been re-checked in over ${STALE_AFTER_DAYS} days, so a cycle was probably missed. They already show as suspect on the site. Oldest: **${oldest?.name}**, ${oldest?.verifiedOn}.`,
      "",
      "No checklist here on purpose. Re-verify what you'd actually use — the affordable, close-to-home rows — and bump `verifiedOn` as you go.",
    );
  } else {
    lines.push(
      `Nothing past the ${STALE_AFTER_DAYS}-day window. Oldest row: **${oldest?.name}**, ${oldest?.verifiedOn}.`,
    );
  }
  lines.push("");
  if (blocked.length) {
    lines.push(`<details><summary>${blocked.length} sites block automated checks (expected, not a fault)</summary>`, "");
    for (const r of blocked) lines.push(`- ${r.p.name} — ${r.detail}`);
    lines.push("", "</details>");
  }
  console.log(lines.join("\n"));
} else {
  const show = (label: string, rs: Result[]) => {
    if (!rs.length) return;
    console.log(`\n${label} (${rs.length})`);
    for (const r of rs) console.log(`  ${r.p.id.padEnd(28)} ${r.detail}\n${" ".repeat(30)}${r.p.url}`);
  };
  console.log(`checked ${results.length} practices`);
  show("DEAD", dead);
  show("MOVED", moved);
  show("UNREACHABLE", unreachable);
  show("BLOCKED (expected)", blocked);
  if (stale.length) {
    console.log(`\nSTALE >${STALE_AFTER_DAYS}d (${stale.length})`);
    for (const p of stale) console.log(`  ${p.id.padEnd(28)} ${p.verifiedOn}`);
  }
  console.log(
    `\nok ${results.filter((r) => r.verdict === "ok").length} · needs action ${needsAction}`,
  );
}

// Never fail the build. This reports a chore; it isn't a test.
process.exit(0);
