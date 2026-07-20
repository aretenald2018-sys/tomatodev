import test from 'node:test';
import assert from 'node:assert/strict';
import { calcWeeklyDietMacroChange } from '../calc.js';
import { buildSeasonDashboardSnapshot } from '../data/season-widget-snapshot.js';

const registry = {
  seasons: [{ id: 'summer', name: 'Summer', startDate: '2026-07-01', endDate: '2026-08-31' }],
};

test('weekly protein change compares matching daily averages', () => {
  const result = calcWeeklyDietMacroChange(
    [{ bProtein: 100 }, { protein: 120 }],
    [{ protein: 80 }, { bProtein: 100 }],
  );
  assert.equal(result.status, 'ready');
  assert.equal(result.currentAvgProteinG, 110);
  assert.equal(result.previousAvgProteinG, 90);
  assert.equal(result.deltaPct, 22.2);
});

test('widget snapshot includes diet summary and explicit empty-state signals', () => {
  const snapshot = buildSeasonDashboardSnapshot({
    cache: {},
    registry,
    todayKey: '2026-07-15',
    runningPlan: { weeklyDistanceKm: 20, weeklySessions: 3 },
    diet: {
      plan: {
        _userSet: true,
        weight: 70,
        height: 175,
        age: 30,
        bodyFatPct: 20,
        targetBodyFatPct: 15,
        targetWeight: 65,
        lossRatePerWeek: 0.005,
        activityFactor: 1.4,
        refeedKcal: 2400,
        refeedDays: [],
      },
      todayDiet: { bKcal: 600, bProtein: 40, bCarbs: 70, bFat: 20 },
      todayRawDay: { breakfast: 'oatmeal' },
      thisWeekDietDays: [{ protein: 120 }, { protein: 100 }],
      lastWeekDietDays: [{ protein: 100 }, { protein: 80 }],
    },
  });

  assert.equal(snapshot.state, 'ready');
  assert.equal(snapshot.diet.state, 'ready');
  assert.equal(snapshot.diet.today.actual.kcal, 600);
  assert.equal(snapshot.diet.today.actual.mealCount, 1);
  assert.equal(snapshot.diet.proteinChange.deltaPct, 22.2);
  assert.equal(snapshot.strength.benchmarkCount, 0);
  assert.equal(snapshot.running.distance.actual, 0);
  assert.equal(snapshot.running.sessions.actual, 0);
});

test('diet snapshot exposes no-plan state without calculating targets', () => {
  const snapshot = buildSeasonDashboardSnapshot({
    registry,
    todayKey: '2026-07-15',
    diet: { plan: { _userSet: false } },
  });
  assert.equal(snapshot.diet.state, 'no-plan');
});
