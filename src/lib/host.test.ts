import { test } from "node:test";
import assert from "node:assert/strict";
import { hostOf, isAggregator, repairUrl } from "./host";

// The directory-to-calendar join is by URL host. These pin the normalisation
// that lets "RBPMW" match "Robert Blackburn Printmaking Workshop" and that
// stops eventbrite.com from matching everything to everything.

test("hostOf strips www and lowercases", () => {
  assert.equal(hostOf("https://www.RBPMW-efanyc.org/classes"), "rbpmw-efanyc.org");
});

test("hostOf maps a known second domain to its canonical host", () => {
  assert.equal(hostOf("https://efa-rbpmw.squarespace.com/x"), "rbpmw-efanyc.org");
});

test("hostOf returns empty for missing or unparseable input", () => {
  assert.equal(hostOf(undefined), "");
  assert.equal(hostOf(null), "");
  assert.equal(hostOf(""), "");
  assert.equal(hostOf("not a url"), "");
});

test("repairUrl fixes the double-scheme mangle that parsed as host 'https'", () => {
  const fixed = repairUrl("http://https//www.rbpmw-efanyc.org/new-events-1/x");
  assert.equal(hostOf(fixed), "rbpmw-efanyc.org");
});

test("repairUrl leaves a well-formed url alone", () => {
  const url = "https://www.fluxfactory.org/event/opening";
  assert.equal(repairUrl(url), url);
});

test("aggregators are recognised so a shared one never joins two venues", () => {
  assert.ok(isAggregator("eventbrite.com"));
  assert.ok(isAggregator("partiful.com"));
  assert.ok(isAggregator("instagram.com"));
});

test("a real venue host is not an aggregator", () => {
  assert.equal(isAggregator("rbpmw-efanyc.org"), false);
  assert.equal(isAggregator("wendyssubway.com"), false);
});
