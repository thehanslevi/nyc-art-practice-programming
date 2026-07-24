import { test } from "node:test";
import assert from "node:assert/strict";
import { titleSignal } from "./mode-signals";

// mode decides which half of the site an event lands in. These pin the two
// bugs the audit shook out: "class" matching inside "Classical", and the
// singular/plural "open studio(s)" flip.

test("a workshop reads as make", () => {
  assert.equal(titleSignal("Intro to Screenprinting Workshop"), "make");
});

test("a concert reads as witness", () => {
  assert.equal(titleSignal("Venture Bond Jazz Quintet Concert"), "witness");
});

test("'Classical' does not match the word 'class' — jazz stays witness", () => {
  // The exact false positive the first audit produced.
  assert.notEqual(titleSignal("Classical/Jazz Improv Music - Kerry Lewis"), "make");
});

test("'Open Studio' (singular) is a session you work in → make", () => {
  assert.equal(titleSignal("Open Studio | Double Exposures"), "make");
});

test("'Open Studios' (plural) is a day you walk through → witness", () => {
  assert.equal(titleSignal("July Open Studios"), "witness");
});

test("an exhibition reads as witness", () => {
  assert.equal(titleSignal("GHP Artists Exhibition 2026"), "witness");
});

test("an artist talk reads as witness", () => {
  assert.equal(titleSignal("Artist Talk: Michelle Im"), "witness");
});

test("a plain title carries no signal — defers to the venue default", () => {
  assert.equal(titleSignal("Producing Fundamentals (1 of 3)"), "none");
});

test("a title with signals both ways is 'both', never a coin-flip", () => {
  assert.equal(titleSignal("Printmaking Workshop & Exhibition Opening"), "both");
});

// Participatory game/tech-making buried in nightlife venues (Wonderville).
test("a playtest reads as make", () => {
  assert.equal(titleSignal("Wonderville's Last Tuesday of the month PLAYTEST"), "make");
});

test("a game jam reads as make", () => {
  assert.equal(titleSignal("Monthly 2 Hr GameJam Club: OBSHAGCE"), "make");
});

test("WordHack (run-together) reads as make", () => {
  assert.equal(titleSignal("WordHack"), "make");
});

test("a rock show at the same venue stays witness/none, not make", () => {
  assert.equal(titleSignal("A night of POWERFUL ROCK"), "none");
});
