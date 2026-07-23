// Minimal first-party usage counts.
//
// The site shipped with no instrumentation at all, so every product decision
// about it — which filters matter, whether anyone opens the directory, which
// feed gets subscribed — was a guess. This records the smallest thing that
// answers those questions.
//
// What it does NOT do: no cookies, no localStorage, no session or device id,
// no IP, no referrer, no page path, no free text. Just an event name and a few
// low-cardinality values. The table is insert-only for the anon key, so the
// log can't be read back by anyone holding the publishable key.
//
// Honours Do Not Track and Global Privacy Control, and never blocks the UI:
// a failed beacon is discarded in silence.

const ENDPOINT =
  "https://djyzqifuckuwdeeltnej.supabase.co/rest/v1/usage_events";
const KEY = "sb_publishable_EIeHwihJheYgPBZbqODuAg_0oCyic99";

type Props = Record<string, string | number | boolean>;

function optedOut(): boolean {
  if (typeof navigator === "undefined") return true;
  const n = navigator as Navigator & {
    doNotTrack?: string;
    globalPrivacyControl?: boolean;
  };
  return (
    n.doNotTrack === "1" ||
    n.globalPrivacyControl === true ||
    (typeof window !== "undefined" &&
      (window as unknown as { doNotTrack?: string }).doNotTrack === "1")
  );
}

/** Dev servers shouldn't pollute the counts. */
function isLocal(): boolean {
  if (typeof window === "undefined") return true;
  return /^(localhost|127\.|\[::1\])/.test(window.location.hostname);
}

const enabled = () => !optedOut() && !isLocal();

// One send per name+props per page view: a filter toggled ten times is one
// person's curiosity, not ten data points.
const seen = new Set<string>();

export function track(name: string, props: Props = {}): void {
  if (!enabled()) return;
  const key = name + JSON.stringify(props);
  if (seen.has(key)) return;
  seen.add(key);

  try {
    const body = JSON.stringify({ name, props });
    void fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: KEY,
        authorization: `Bearer ${KEY}`,
        prefer: "return=minimal",
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let a count break the page */
  }
}
