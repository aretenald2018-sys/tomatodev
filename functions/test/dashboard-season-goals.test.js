"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSeasonHealthGoals } = require("../dashboard/season-goals");

const season = { id: "summer", name: "여름 시즌", startDate: "2026-07-01", endDate: "2026-08-31" };

test("current season week resolves stair goals and explicit completion state", () => {
  const result = buildSeasonHealthGoals({
    season,
    todayKey: "2026-07-16",
    board: {
      seasonId: "summer",
      benchmarks: [{ id: "squat", label: "스쿼트", groupId: "lower", status: "active", program: "stair", tracks: ["volume"], setsDefault: 4 }],
      cycles: [{ id: "c1", groupId: "lower", startDate: "2026-07-13", weeks: 6, status: "active" }],
      steps: [{ benchmarkId: "squat", track: "volume", cycleId: "c1", weekStart: "2026-07-13", span: 1, kg: 105, reps: 6, sets: 4, weekLog: { "2026-07-13": { paintedAt: 123 } } }],
    },
  });
  assert.equal(result.state, "ready");
  assert.equal(result.seasonWeek, 3);
  assert.deepEqual(result.items[0], {
    benchmarkId: "squat",
    exerciseId: null,
    track: "volume",
    label: "스쿼트",
    value: "105kg × 6",
    status: "4세트 · 완료",
    state: "done",
    week: 1,
    kg: 105,
    reps: 6,
    sets: 4,
    amrap: false,
  });
});

test("W863 goal uses the registered season board prescription for the current week", () => {
  const result = buildSeasonHealthGoals({
    season,
    todayKey: "2026-07-16",
    board: {
      seasonId: "summer",
      benchmarks: [{
        id: "bench", label: "벤치프레스", exerciseId: "bench", movementId: "barbell_bench", groupId: "chest",
        status: "active", program: "wendler", programStartDate: "2026-07-01",
        wendler: { scheme: "w863", templateVersion: "w863-original-v1", profileId: "bench", oneRmKg: 100, tmKg: 90, roundKg: 5 },
        wendlerLog: {},
      }],
      cycles: [{ id: "c1", groupId: "chest", startDate: "2026-06-29", weeks: 7, status: "active" }],
      steps: [],
    },
  });
  assert.equal(result.items[0].week, 3);
  assert.equal(result.items[0].value, "80kg × 3+");
  assert.equal(result.items[0].status, "계획");
});

test("a stale board from a different season is never rendered", () => {
  const result = buildSeasonHealthGoals({ season, todayKey: "2026-07-16", board: { seasonId: "spring" } });
  assert.equal(result.state, "missing");
  assert.deepEqual(result.items, []);
});
