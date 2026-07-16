"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ceilingTargetScore,
  computeOverallScore,
  freshnessStatus,
  mixedScore,
  targetProgressScore,
  trendScore,
} = require("../dashboard/scoring");
const { DEFAULT_DASHBOARD_WEIGHTS } = require("../dashboard/contract");

test("food target progress rewards reaching the target and penalizes overshoot", () => {
  assert.equal(targetProgressScore(800, 1000), 80);
  assert.equal(targetProgressScore(1000, 1000), 100);
  assert.equal(targetProgressScore(1200, 1000), 80);
  assert.equal(targetProgressScore(0, 0), null);
});

test("spending target remains perfect below pace and declines above pace", () => {
  assert.equal(ceilingTargetScore(800, 1000), 100);
  assert.equal(ceilingTargetScore(1200, 1000), 80);
});

test("goal and trend use an 80/20 mix only when trend samples exist", () => {
  assert.equal(mixedScore(80, null), 80);
  assert.equal(mixedScore(80, 100), 84);
  assert.ok(trendScore(110, 100) > 50);
  assert.ok(trendScore(90, 100, { lowerIsBetter: true }) > 50);
});

test("freshness boundaries preserve delayed data and exclude stale data", () => {
  const now = 10 * 24 * 60 * 60 * 1000;
  assert.equal(freshnessStatus(now - 24 * 60 * 60 * 1000, now), "fresh");
  assert.equal(freshnessStatus(now - 7 * 24 * 60 * 60 * 1000, now), "delayed");
  assert.equal(freshnessStatus(now - 7 * 24 * 60 * 60 * 1000 - 1, now), "stale");
});

test("overall score renormalizes available domains and requires three domains with weight 60", () => {
  const ready = {
    food: { score: 80, freshness: "fresh" },
    health: { score: 90, freshness: "delayed" },
    running: { score: 100, freshness: "fresh" },
    spending: { score: null, freshness: "missing" },
    wine: { score: null, freshness: "missing" },
  };
  assert.equal(computeOverallScore(ready, DEFAULT_DASHBOARD_WEIGHTS).score, 89);
  ready.running.freshness = "stale";
  assert.equal(computeOverallScore(ready, DEFAULT_DASHBOARD_WEIGHTS).score, null);
});
