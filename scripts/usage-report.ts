// Read the usage counts.
//
//   npx tsx scripts/usage-report.ts        last 30 days
//   npx tsx scripts/usage-report.ts 90     last 90 days
//
// Needs SUPABASE_SERVICE_KEY, because the browser's publishable key is
// insert-only by design and cannot read this table back.
const DAYS = Number(process.argv[2] ?? 30);
const URL = "https://djyzqifuckuwdeeltnej.supabase.co/rest/v1/usage_events";
const KEY = process.env.SUPABASE_SERVICE_KEY;

if (!KEY) {
  console.error(
    "Set SUPABASE_SERVICE_KEY (Supabase dashboard → Project Settings → API →\n" +
      "service_role). The publishable key cannot read this table.",
  );
  process.exit(1);
}

const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
const res = await fetch(
  `${URL}?select=name,props,created_at&created_at=gte.${since}&limit=100000`,
  { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } },
);
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

interface Row {
  name: string;
  props: Record<string, unknown>;
  created_at: string;
}
const rows = (await res.json()) as Row[];

if (rows.length === 0) {
  console.log(`No usage recorded in the last ${DAYS} days.`);
  process.exit(0);
}

const tally = (key: (r: Row) => string) => {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const show = (title: string, entries: [string, number][]) => {
  if (!entries.length) return;
  console.log(`\n${title}`);
  const width = Math.max(...entries.map(([k]) => k.length));
  for (const [k, n] of entries) console.log(`  ${k.padEnd(width)}  ${n}`);
};

console.log(`${rows.length} events over ${DAYS} days`);
show("By type", tally((r) => r.name));
show(
  "Views",
  tally((r) => (r.name === "view" ? String(r.props.view ?? "") : "")),
);
show(
  "Filters used",
  tally((r) =>
    r.name === "filter"
      ? [r.props.kind, r.props.value].filter(Boolean).join(": ")
      : "",
  ),
);
