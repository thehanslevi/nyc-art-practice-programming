import { useMemo, useState } from "react";

interface Feed {
  key: string;
  label: string;
  filename: string;
  description: string;
}

const FEEDS: Feed[] = [
  {
    key: "all",
    label: "Everything",
    filename: "feed.ics",
    description: "Every event on the calendar.",
  },
  {
    key: "attend",
    label: "Attend",
    filename: "feed-attend.ics",
    description: "Shows, concerts, screenings.",
  },
  {
    key: "practice",
    label: "Practice",
    filename: "feed-practice.ics",
    description: "Classes and workshops.",
  },
];

function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false);
  }
  return Promise.resolve(false);
}

export function SubscribePanel() {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const handleCopy = async (feed: Feed) => {
    const ok = await copyText(`${origin}/${feed.filename}`);
    if (ok) {
      setCopiedKey(feed.key);
      setTimeout(() => setCopiedKey(null), 1600);
    }
  };

  return (
    <div className="subscribe-panel">
      <button
        type="button"
        className="subscribe-badge"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Subscribe from Google or Apple Calendar"
      >
        📅 Subscribe
      </button>
      {open ? (
        <div className="subscribe-popover" role="dialog">
          <p className="subscribe-title">Subscribe from your calendar app</p>
          <p className="subscribe-copy">
            Pick a feed, copy its URL, and subscribe from Google Calendar or
            Apple Calendar. It'll auto-refresh — updates land in your calendar
            within a day of every push.
          </p>
          <ul className="subscribe-list">
            {FEEDS.map((feed) => {
              const url = `${origin}/${feed.filename}`;
              const copied = copiedKey === feed.key;
              return (
                <li key={feed.key} className="subscribe-item">
                  <div className="subscribe-item-head">
                    <span className="subscribe-item-label">{feed.label}</span>
                    <button
                      type="button"
                      className={`subscribe-copy-btn${copied ? " copied" : ""}`}
                      onClick={() => handleCopy(feed)}
                    >
                      {copied ? "Copied ✓" : "Copy URL"}
                    </button>
                  </div>
                  <div className="subscribe-item-desc">{feed.description}</div>
                  <code className="subscribe-item-url">{url}</code>
                </li>
              );
            })}
          </ul>
          <details className="subscribe-help">
            <summary>How to subscribe</summary>
            <p>
              <strong>Google Calendar:</strong> Left sidebar → "Other calendars"
              + → "From URL" → paste. Refreshes ~every 12–24 hours.
            </p>
            <p>
              <strong>Apple Calendar (Mac):</strong> File → New Calendar
              Subscription → paste URL. Set auto-refresh cadence in the dialog.
            </p>
          </details>
        </div>
      ) : null}
    </div>
  );
}
