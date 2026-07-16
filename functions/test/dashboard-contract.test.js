"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDashboardSnapshot } = require("../dashboard/aggregate");
const { validateDashboardSnapshot } = require("../dashboard/contract");

test("dashboard-v1 fixture is complete and leaves missing wine unrated", () => {
  const now = Date.UTC(2026, 6, 16, 3);
  const snapshot = buildDashboardSnapshot({
    revision: 7,
    nowEpochMs: now,
    tomato: {
      settings: {
        diet_plan: { height: 175, weight: 75, age: 32, bodyFatPct: 17, targetWeight: 68, targetBodyFatPct: 10 },
        season_registry: { seasons: [{ id: "s1", startDate: "2026-07-01", endDate: "2026-08-31" }] },
        season_s1_workout_plan: { weeklySessionTarget: 3 },
        season_s1_running_plan: { weeklyDistanceKm: 20, weeklySessions: 3 },
      },
      workouts: [
        {
          id: "2026-07-16",
          bKcal: 500,
          lKcal: 600,
          dKcal: 700,
          bProtein: 35,
          lProtein: 45,
          dProtein: 55,
          exercises: [{ name: "스쿼트", sets: [{ kg: 100, reps: 8, done: true }, { kg: 100, reps: 8, done: true }] }],
          running: true,
          runDistance: 5,
          runDurationSec: 1650,
          runAvgPaceSecPerKm: 330,
          runRouteSummary: { cadenceSpm: 176 },
        },
      ],
    },
    budget: {
      categories: [{ id: "food", kind: "expense", budgetRhythm: "spread", target: 600000, monthlyTargets: { "2026-07": 600000 } }],
      transactions: [{ id: "t1", categoryId: "food", type: "card_payment", amount: 10000, occurredAt: new Date(now - 3600000) }],
      tastings: [],
      bottles: [],
    },
  });
  assert.equal(snapshot.revision, 7);
  assert.equal(snapshot.domains.wine.score, null);
  assert.equal(validateDashboardSnapshot(snapshot).ok, true);
  assert.ok(snapshot.domains.food.score > 0);
  assert.equal(snapshot.workouts[0].label, "스쿼트");
});

test("wine score uses only the five most recent valid ratings", () => {
  const now = Date.UTC(2026, 6, 16, 3);
  const tastings = [5, 4.5, 4, 3.5, 3, 1].map((score, index) => ({
    id: `t${index}`,
    bottleId: "b1",
    taewooScore: score,
    tastedAt: new Date(now - index * 60000),
  }));
  const snapshot = buildDashboardSnapshot({
    nowEpochMs: now,
    tomato: { workouts: [], settings: {} },
    budget: { transactions: [], categories: [], tastings, bottles: [{ id: "b1", name: "Test Wine" }] },
  });
  assert.equal(snapshot.domains.wine.ratedCount, 5);
  assert.equal(snapshot.domains.wine.averageRating, 4);
  assert.equal(snapshot.domains.wine.score, 80);
  assert.equal(snapshot.wine.name, "Test Wine");
});
