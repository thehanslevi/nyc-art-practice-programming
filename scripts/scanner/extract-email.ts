import { ImapFlow } from "imapflow";
import type { CalEvent } from "../../src/types";
import type { Candidate } from "./extract";
import { callLlm, hasLlm, isQuotaExhausted } from "./llm";

const SYSTEM_PROMPT = `You extract dated ARTS and CREATIVE-PRACTICE events from an email newsletter into strict JSON.

This is a curated arts calendar. Extract ONLY events that are art or creative practice:
- INCLUDE: concerts, DJ sets, live music; theatre, dance, performance; film screenings; art/photo exhibitions and openings; poetry/prose readings, book launches, artist talks; and hands-on art/craft/making classes and workshops (writing, printmaking, ceramics, darkroom, music production, filmmaking, textiles, woodworking, etc.).
- EXCLUDE — do NOT extract these even if dated: civic or community-service events, environmental / garden / tree / water stewardship, tree counts, recycling, volunteer days, nature walks, forest bathing, bird walks; sports and watch parties; markets, shopping, sales; food-only socials, picnics, pizza parties (unless it's a cooking CLASS); fundraisers/galas; fitness/wellness; tours; and general info sessions. When an event is not clearly arts or creative practice, OMIT it.

Rules:
- ONLY include events with a specific date in 2026 or 2027.
- Date format: three-letter month + day, e.g. "Jul 26", "Nov 4".
- Day format: three-letter weekday (Mon/Tue/Wed/Thu/Fri/Sat/Sun).
- Times: 24-hour "HH:MM" or null.
- Skip anything without a firm date and a venue name. Skip past events (before today).
- Return at most 40 events.

Category (pick one): sound, dance, film, tech, making, theatre, literature, community
Mode: make (class, workshop, participatory) · witness (show, screening, concert, reading)

Return a JSON object {"events": [ ... ]}. For each event fill: day, date, event
title verbatim, where (venue name/address), cost (FREE / $X / $X-Y / TBD),
category, mode, start/end HH:MM or null, url.`;

export interface EmailCandidate extends Candidate {
  source: "email";
  emailFrom: string;
  emailSubject: string;
}

export async function extractFromEmail(todayISO: string): Promise<EmailCandidate[]> {
  // Use || not ?? — CI passes unset secrets as empty strings, which must
  // fall back to the defaults (an empty host would dial localhost:993).
  const address = process.env.IMAP_EMAIL;
  const password = process.env.IMAP_APP_PASSWORD;
  const host = process.env.IMAP_HOST || "imap.gmail.com";
  const port = Number(process.env.IMAP_PORT || 993);
  const folder = process.env.IMAP_FOLDER || "INBOX";

  if (!address || !password) {
    console.log("→ Email pipeline skipped (IMAP_EMAIL / IMAP_APP_PASSWORD not set)");
    return [];
  }
  if (!hasLlm()) {
    console.warn("   Email pipeline needs an LLM key (Groq/Cerebras/Gemini) — skipping");
    return [];
  }
  if (isQuotaExhausted()) {
    console.warn("   Email pipeline skipped — LLM providers already exhausted this run");
    return [];
  }

  console.log(`→ Email pipeline · connecting to ${host} (${folder})`);
  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: address, pass: password },
    logger: false,
  });

  const messages: {
    body: string;
    from: string;
    subject: string;
    receivedAt: Date;
  }[] = [];

  try {
    await client.connect();
    await client.mailboxOpen(folder);

    // Only look at emails from the last 14 days
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const uids = await client.search({ since });
    if (!uids || uids.length === 0) {
      console.log("   no recent messages");
      return [];
    }
    console.log(`   ${uids.length} messages in the last 14 days`);

    for await (const msg of client.fetch(uids, { envelope: true, source: true })) {
      const from = msg.envelope?.from?.[0]?.address ?? "unknown";
      const subject = msg.envelope?.subject ?? "";
      const body = (msg.source ?? Buffer.alloc(0)).toString("utf8");
      if (!body) continue;
      messages.push({
        body: htmlBodyOrPlain(body),
        from,
        subject,
        receivedAt: msg.envelope?.date ?? new Date(),
      });
    }
  } finally {
    await client.logout().catch(() => {});
  }

  // Batch several newsletters into each LLM call. Free-tier request-per-minute
  // caps make one-call-per-email unreliable (rate-limited emails get skipped),
  // so a handful of calls is far more robust than 16.
  const BATCH_SIZE = 3;
  const PER_EMAIL_CHARS = 9000;
  const batches: (typeof messages)[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }
  console.log(
    `   → ${messages.length} messages in ${batches.length} batches, feeding to LLM`,
  );

  const candidates: EmailCandidate[] = [];
  for (const batch of batches) {
    if (isQuotaExhausted()) {
      console.warn("   LLM exhausted — stopping email extraction early");
      break;
    }
    const senders = batch.map((m) => m.from).join(", ");
    const prompt = `Below are ${batch.length} newsletters, separated by "=====". Extract arts events from ALL of them.
Today (skip anything before): ${todayISO}

${batch
      .map(
        (m) =>
          `===== NEWSLETTER =====\nFrom: ${m.from}\nSubject: ${m.subject}\n\n${m.body.slice(0, PER_EMAIL_CHARS)}`,
      )
      .join("\n\n")}`;
    try {
      const text = await callLlm(SYSTEM_PROMPT, prompt);
      if (text === null) continue;
      const parsed = safeParse(text);
      if (!parsed?.events) continue;
      for (const raw of parsed.events) {
        const event = normalize(raw);
        if (!event) continue;
        candidates.push({
          event,
          venue: {
            name: `Email: ${event.where}`,
            url: event.url,
            category: event.category,
            defaultMode: event.mode,
            whereTemplate: event.where,
          },
          sourceHtml: batch.map((m) => m.body).join("\n"),
          source: "email",
          emailFrom: senders,
          emailSubject: "",
        });
      }
    } catch (err) {
      console.error(
        `   email batch extraction failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`   → ${candidates.length} candidates from email`);
  return candidates;
}

function htmlBodyOrPlain(raw: string): string {
  // The raw MIME source has headers + boundaries. Strip everything before the
  // first blank line, then strip HTML if present and normalize whitespace.
  const bodyStart = raw.indexOf("\r\n\r\n");
  const body = bodyStart >= 0 ? raw.slice(bodyStart + 4) : raw;
  return body
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/=\r?\n/g, "") // quoted-printable soft line breaks
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function safeParse(text: string): { events?: unknown[] } | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as { events?: unknown[] };
  } catch {
    return null;
  }
}

function normalize(raw: unknown): CalEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const day = str(r["day"]);
  const date = str(r["date"]);
  const eventTitle = str(r["event"]);
  const where = str(r["where"]);
  const cost = str(r["cost"]) ?? "TBD";
  const category = str(r["category"]);
  const mode = str(r["mode"]);
  const flag = str(r["flag"]);
  const start = str(r["start"]);
  const end = str(r["end"]);
  const note = str(r["note"]);
  const url = str(r["url"]);
  if (!day || !date || !eventTitle || !where || !category || !mode || !url) return null;
  return {
    day,
    date,
    event: eventTitle,
    where,
    cost,
    category: category as CalEvent["category"],
    flag: (flag as CalEvent["flag"]) ?? null,
    mode: mode as CalEvent["mode"],
    start,
    end,
    note,
    url,
  };
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}
