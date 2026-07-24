import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPlatform } from "./extract-platform.ts";
import type { Venue } from "./venues.ts";

// Regression: extract-platform once called classifyEvent without importing it,
// so the Squarespace/Tribe parser threw "classifyEvent is not defined" the
// instant it matched an event. The scan loop swallowed the error per-venue, so
// it stayed invisible until a probe hit a Squarespace page. This test drives a
// real match, which is exactly the path that used to throw.

const VENUE: Venue = {
  name: "Test Clay Studio",
  url: "https://example.org/events",
  category: "making",
  defaultMode: "make",
  whereTemplate: "Test Clay Studio, Somewhere",
};

// Minimal Squarespace event-collection markup the parser recognises.
const SQUARESPACE_HTML = `
  <article class="eventlist-event eventlist-event--upcoming">
    <time datetime="2026-09-15T19:00">Sep 15</time>
    <a class="eventlist-title-link" href="/events/wheel-throwing">Wheel Throwing Intro</a>
  </article>
`;

test("extractPlatform classifies a Squarespace event without throwing", () => {
  // The whole point: this call reaches toEvent -> classifyEvent.
  const events = extractPlatform(SQUARESPACE_HTML, VENUE, "2026-07-24");
  assert.equal(events.length, 1);
  const e = events[0]!;
  assert.equal(e.event, "Wheel Throwing Intro");
  assert.equal(e.date, "Sep 15");
  // "Intro" is a make signal, and the venue defaults to make either way.
  assert.equal(e.mode, "make");
  assert.equal(e.category, "making");
});

test("extractPlatform returns nothing for markup with no events", () => {
  assert.deepEqual(extractPlatform("<p>no events here</p>", VENUE, "2026-07-24"), []);
});
