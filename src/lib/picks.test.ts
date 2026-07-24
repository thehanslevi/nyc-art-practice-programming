import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalEvent } from "../types";
import {
  buildPickIndex,
  canonicalizePicks,
  legacyPickId,
  pickId,
} from "./picks";

// A pick surviving a rename or a merge is the invariant that kept all 8 curator
// picks resolving through this session's title normalisations. These tests pin
// it so a future change to the identity model can't silently drop stars.

function ev(partial: Partial<CalEvent> & { uid: string }): CalEvent {
  return {
    day: "Sat",
    date: "Jul 26",
    event: "Untitled",
    where: "Somewhere",
    cost: "FREE",
    category: "making",
    mode: "make",
    ...partial,
  } as CalEvent;
}

test("pickId is the uid, never the title", () => {
  assert.equal(pickId({ uid: "e_abc" }), "e_abc");
});

test("index resolves an event by its uid", () => {
  const e = ev({ uid: "e_1", date: "Jul 26", event: "Relief Printmaking" });
  const idx = buildPickIndex([e]);
  assert.equal(idx.get("e_1"), e);
});

test("index resolves the legacy date|title key", () => {
  const e = ev({ uid: "e_1", date: "Jul 26", event: "Relief Printmaking" });
  const idx = buildPickIndex([e]);
  assert.equal(idx.get(legacyPickId(e)), e);
  assert.equal(idx.get("Jul 26|Relief Printmaking"), e);
});

test("index resolves every alias — a pick saved before a rename still finds it", () => {
  const e = ev({
    uid: "e_1",
    date: "Jul 26",
    event: "Maybe Sometimes — a reading",
    aliases: ["Jul 26|Wendy's Subway: Maybe Sometimes — a reading"],
  });
  const idx = buildPickIndex([e]);
  assert.equal(idx.get("Jul 26|Wendy's Subway: Maybe Sometimes — a reading"), e);
});

test("canonicalize rewrites a legacy pick to the uid", () => {
  const e = ev({ uid: "e_1", date: "Jul 26", event: "Relief Printmaking" });
  const idx = buildPickIndex([e]);
  const out = canonicalizePicks(["Jul 26|Relief Printmaking"], idx);
  assert.deepEqual([...out], ["e_1"]);
});

test("canonicalize rewrites an alias (merged duplicate) to the surviving uid", () => {
  const survivor = ev({ uid: "e_new", aliases: ["e_old"] });
  const idx = buildPickIndex([survivor]);
  const out = canonicalizePicks(["e_old"], idx);
  assert.deepEqual([...out], ["e_new"]);
});

test("canonicalize KEEPS an unresolvable id — never silent data loss", () => {
  // The event may be absent from this bundle for reasons unrelated to intent.
  // Dropping the star and re-uploading the shorter list is the exact bug the
  // uid model exists to prevent.
  const idx = buildPickIndex([ev({ uid: "e_present" })]);
  const out = canonicalizePicks(["e_present", "e_missing_entirely"], idx);
  assert.ok(out.has("e_present"));
  assert.ok(out.has("e_missing_entirely"));
  assert.equal(out.size, 2);
});

test("canonicalize collapses duplicate identities of one event to a single uid", () => {
  const e = ev({ uid: "e_1", date: "Jul 26", event: "Relief Printmaking" });
  const idx = buildPickIndex([e]);
  // Same event referenced by uid AND by its legacy key must not double-count.
  const out = canonicalizePicks(["e_1", "Jul 26|Relief Printmaking"], idx);
  assert.deepEqual([...out], ["e_1"]);
});
