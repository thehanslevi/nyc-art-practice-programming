import { useEffect, useState } from "react";

export type SyncStatus =
  | { kind: "idle" }
  | { kind: "syncing" }
  | { kind: "synced"; at: Date }
  | { kind: "error"; message: string };

interface Props {
  passphrase: string | null;
  onSet: (next: string | null) => Promise<void>;
  onSyncNow: () => Promise<void>;
  status: SyncStatus;
}

export function SyncPanel({ passphrase, onSet, onSyncNow, status }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInput(passphrase ?? "");
  }, [passphrase]);

  const syncing = status.kind === "syncing" || saving;

  const handleSave = async () => {
    const trimmed = input.trim();
    if (trimmed.length < 4) return;
    setSaving(true);
    try {
      await onSet(trimmed);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSet(null);
      setInput("");
    } finally {
      setSaving(false);
    }
  };

  const label = passphrase ? "Sync: on" : "Sync: off";
  const badgeClass = passphrase ? "sync-badge on" : "sync-badge off";

  return (
    <div className="sync-panel">
      <button
        type="button"
        className={badgeClass}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        ⟲ {label}
        {status.kind === "syncing" ? " · syncing…" : null}
        {status.kind === "error" ? " · error" : null}
      </button>
      {open ? (
        <div className="sync-popover" role="dialog">
          <p className="sync-title">Cross-device sync</p>
          <p className="sync-copy">
            Set a passphrase on each device you use. Any device with the same
            passphrase shares the same picks. It's a shared secret — not an
            account, not tied to email.
          </p>
          <div className="sync-input-row">
            <input
              type="password"
              className="sync-input"
              placeholder="Choose a passphrase (min 4 chars)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="sync-save-btn"
              onClick={handleSave}
              disabled={syncing || input.trim().length < 4 || input.trim() === passphrase}
            >
              {saving ? "…" : passphrase ? "Update" : "Turn on"}
            </button>
          </div>
          {passphrase ? (
            <div className="sync-controls">
              <button
                type="button"
                className="sync-secondary-btn"
                onClick={onSyncNow}
                disabled={syncing}
              >
                Sync now
              </button>
              <button
                type="button"
                className="sync-secondary-btn danger"
                onClick={handleClear}
                disabled={syncing}
              >
                Turn off sync
              </button>
            </div>
          ) : null}
          <p className="sync-status-line">
            {status.kind === "idle" && !passphrase ? "Off — picks are local only." : null}
            {status.kind === "idle" && passphrase ? "Ready." : null}
            {status.kind === "syncing" ? "Syncing…" : null}
            {status.kind === "synced"
              ? `Last synced ${status.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : null}
            {status.kind === "error" ? status.message : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
