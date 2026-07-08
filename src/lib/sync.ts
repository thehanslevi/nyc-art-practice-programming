import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://djyzqifuckuwdeeltnej.supabase.co";
const SUPABASE_KEY = "sb_publishable_EIeHwihJheYgPBZbqODuAg_0oCyic99";

const PASSPHRASE_KEY = "nyc-cal:sync-passphrase:v1";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function loadPassphrase(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PASSPHRASE_KEY);
  } catch {
    return null;
  }
}

export function savePassphrase(passphrase: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (passphrase === null) {
      window.localStorage.removeItem(PASSPHRASE_KEY);
    } else {
      window.localStorage.setItem(PASSPHRASE_KEY, passphrase);
    }
  } catch {
    /* quota */
  }
}

/** Unguessable, retypeable token (~62 bits) used as an auto-generated passphrase. */
export function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    if (i === 4 || i === 8) out += "-";
    out += chars[bytes[i]! % chars.length];
  }
  return out;
}

export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase.trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fetchPicks(passphrase: string): Promise<string[] | null> {
  return fetchPicksByHash(await hashPassphrase(passphrase));
}

/** Fetch a picks list by its passphrase hash directly (e.g. the curator's). */
export async function fetchPicksByHash(hash: string): Promise<string[]> {
  return (await fetchByHash(hash)).picks;
}

export type PickNotes = Record<string, string>;

/** Fetch both picks and curator notes for a passphrase hash. */
export async function fetchByHash(
  hash: string,
): Promise<{ picks: string[]; notes: PickNotes }> {
  const { data, error } = await supabase
    .from("picks")
    .select("picks, notes")
    .eq("passphrase_hash", hash)
    .maybeSingle();
  if (error || !data) return { picks: [], notes: {} };
  const raw = data as { picks: unknown; notes: unknown };
  const picks = Array.isArray(raw.picks)
    ? raw.picks.filter((p): p is string => typeof p === "string")
    : [];
  const notes: PickNotes = {};
  if (raw.notes && typeof raw.notes === "object") {
    for (const [k, v] of Object.entries(raw.notes as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) notes[k] = v;
    }
  }
  return { picks, notes };
}

export async function uploadPicks(
  passphrase: string,
  picks: string[],
): Promise<void> {
  const hash = await hashPassphrase(passphrase);
  // Only touch the picks column so a concurrent note write isn't clobbered.
  const { error } = await supabase.from("picks").upsert(
    {
      passphrase_hash: hash,
      picks,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "passphrase_hash" },
  );
  if (error) throw error;
}

/** Persist the curator's full notes map (pickId → editorial line). */
export async function uploadNotes(
  passphrase: string,
  notes: PickNotes,
): Promise<void> {
  const hash = await hashPassphrase(passphrase);
  const { error } = await supabase.from("picks").upsert(
    {
      passphrase_hash: hash,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "passphrase_hash" },
  );
  if (error) throw error;
}
