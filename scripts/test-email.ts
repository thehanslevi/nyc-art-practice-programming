// Read-only test of the email/newsletter pipeline. Connects to the IMAP
// mailbox, extracts events from recent newsletters via the LLM, runs them
// through the same gates as a real scan, and PRINTS what would be accepted
// vs rejected — without writing events.json or committing anything.
//
//   npx tsx scripts/test-email.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EventsData } from "../src/types.ts";
import { extractFromEmail } from "./scanner/extract-email.ts";
import { makeGateRunner } from "./scanner/gates.ts";

async function main(): Promise<void> {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const year = now.getFullYear();

  const events = JSON.parse(
    readFileSync(resolve("src/data/events.json"), "utf8"),
  ) as EventsData;
  const runGate = makeGateRunner(events, todayISO, year);

  console.log(`\n=== EMAIL TEST RUN · ${todayISO} (read-only, nothing saved) ===`);
  const candidates = await extractFromEmail(todayISO);
  console.log(`\n${candidates.length} raw event candidates extracted from newsletters\n`);

  // Which newsletters produced candidates
  const bySender = new Map<string, number>();
  for (const c of candidates) {
    bySender.set(c.emailFrom, (bySender.get(c.emailFrom) ?? 0) + 1);
  }
  if (bySender.size > 0) {
    console.log("Candidates by sender:");
    for (const [s, n] of [...bySender.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${String(n).padStart(3)}  ${s}`);
    }
  }

  const accepted: typeof candidates = [];
  const rejected: { c: (typeof candidates)[number]; reason: string }[] = [];
  for (const c of candidates) {
    const g = runGate(c);
    if (g.pass) accepted.push(c);
    else rejected.push({ c, reason: g.reason ?? "unknown" });
  }

  console.log(`\n=== ${accepted.length} would be ADDED to the calendar ===`);
  for (const c of accepted) {
    const e = c.event;
    console.log(
      `  ✓ ${e.date} ${e.day}  ${e.event}  [${e.category}/${e.mode}] · ${e.cost} · ${e.where}`,
    );
    console.log(`      via: "${c.emailSubject}" <${c.emailFrom}>`);
  }

  console.log(`\n=== ${rejected.length} rejected (reasons) ===`);
  const byReason = new Map<string, number>();
  for (const { reason } of rejected) {
    const key = reason.replace(/".*?"/g, "…").slice(0, 44);
    byReason.set(key, (byReason.get(key) ?? 0) + 1);
  }
  for (const [r, n] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(3)}  ${r}`);
  }
  console.log("\n  sample rejected:");
  for (const { c, reason } of rejected.slice(0, 12)) {
    console.log(`   ✗ [${reason.slice(0, 28)}] ${c.event.date} ${c.event.event.slice(0, 42)}`);
  }

  console.log("\n=== end of test run · no data written ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
