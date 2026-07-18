import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveComparablePaceBaseline,
  evaluateRunningPaceGoal,
  normalizeRunningPacePlan,
} from '../data/running-pace-goal.js';

const run = (dateKey, pace, distanceKm = 5, extra = {}) => ({
  dateKey,
  avgPaceSecPerKm: pace,
  distanceKm,
  ...extra,
});

test('pace baseline requires three comparable runs in the prior 28 days and uses the median', () => {
  const result = deriveComparablePaceBaseline([
    run('2026-03-10', 370),
    run('2026-03-20', 350),
    run('2026-04-01', 360),
    run('2026-04-02', 200, 10),
  ], { asOfDate: '2026-04-05', referenceDistanceKm: 5 });
  assert.equal(result.status, 'ready');
  assert.equal(result.sampleCount, 3);
  assert.equal(result.paceSecPerKm, 360);

  const collecting = deriveComparablePaceBaseline(result.activities.slice(0, 2), {
    asOfDate: '2026-04-05',
    referenceDistanceKm: 5,
  });
  assert.equal(collecting.status, 'collecting');
  assert.equal(collecting.paceSecPerKm, null);
});

test('adaptive pace advances weekly, caps at five seconds, and resets after two failed checks', () => {
  const evaluation = evaluateRunningPaceGoal({
    season: { startDate: '2026-04-06', endDate: '2026-05-31' },
    todayKey: '2026-04-27',
    plan: {
      paceMode: 'adaptive-weekly',
      baselinePaceSecPerKm: 600,
      targetPaceSecPerKm: 600,
      adaptiveRatePct: 1.5,
      referenceDistanceKm: 5,
      paceCheckWeekday: 3,
      startDate: '2026-04-06',
      endDate: '2026-05-31',
      recoveryEveryWeeks: 0,
    },
    activities: [
      run('2026-04-08', 595),
      run('2026-04-15', 610),
      run('2026-04-22', 605),
    ],
  });
  assert.equal(evaluation.weeks[0].state, 'achieved');
  assert.equal(evaluation.weeks[0].nextTargetPaceSecPerKm, 595, 'weekly step is capped at 5 sec/km');
  assert.equal(evaluation.weeks[1].state, 'attempted');
  assert.equal(evaluation.weeks[2].holdReason, 'two-miss-reset');
  assert.equal(evaluation.weeks[3].targetPaceSecPerKm, 605, 'recent median relaxes the target after two misses');
});

test('recovery and prior-30-day single-run spike weeks hold while manual mode never advances', () => {
  const base = {
    season: { startDate: '2026-04-06', endDate: '2026-05-10' },
    todayKey: '2026-04-27',
    activities: [
      run('2026-04-08', 350, 5),
      run('2026-04-15', 345, 6),
      run('2026-04-22', 340, 6),
    ],
  };
  const adaptive = evaluateRunningPaceGoal({
    ...base,
    plan: {
      paceMode: 'adaptive-weekly', targetPaceSecPerKm: 360, baselinePaceSecPerKm: 360,
      adaptiveRatePct: 1, referenceDistanceKm: 5, paceCheckWeekday: 3,
      startDate: '2026-04-06', endDate: '2026-05-10', recoveryEveryWeeks: 3,
    },
  });
  assert.equal(adaptive.weeks[1].holdReason, 'single-run-distance-spike');
  assert.equal(adaptive.weeks[2].holdReason, 'recovery-week');

  const manual = evaluateRunningPaceGoal({
    ...base,
    plan: { paceMode: 'manual', targetPaceSecPerKm: 360, startDate: '2026-04-06', endDate: '2026-05-10' },
  });
  assert.equal(manual.weeks[0].nextTargetPaceSecPerKm, 360);
  assert.equal(normalizeRunningPacePlan({ adaptiveRatePct: 9 }, base.season).adaptiveRatePct, 1);
});

test('weekly distance growth above ten percent holds pace progression without a single-run spike', () => {
  const evaluation = evaluateRunningPaceGoal({
    season: { startDate: '2026-04-06', endDate: '2026-05-10' },
    todayKey: '2026-04-27',
    plan: {
      paceMode: 'adaptive-weekly', targetPaceSecPerKm: 360, baselinePaceSecPerKm: 360,
      adaptiveRatePct: 1, referenceDistanceKm: 5, paceCheckWeekday: 3,
      startDate: '2026-04-06', endDate: '2026-05-10', recoveryEveryWeeks: 0,
    },
    activities: [
      run('2026-04-08', 350, 6),
      run('2026-04-15', 345, 4, { paceCheck: true }),
      run('2026-04-16', 350, 4),
    ],
  });
  assert.equal(evaluation.weeks[1].distanceKm, 8);
  assert.equal(evaluation.weeks[1].previousWeekDistanceKm, 6);
  assert.equal(evaluation.weeks[1].weeklyDistanceSpike, true);
  assert.equal(evaluation.weeks[1].holdReason, 'weekly-distance-spike');
  assert.equal(evaluation.weeks[1].nextTargetPaceSecPerKm, evaluation.weeks[1].targetPaceSecPerKm);
});

test('weekly distance growth at ten percent or less can still advance after a successful pace check', () => {
  const evaluation = evaluateRunningPaceGoal({
    season: { startDate: '2026-04-06', endDate: '2026-05-10' },
    todayKey: '2026-04-27',
    plan: {
      paceMode: 'adaptive-weekly', targetPaceSecPerKm: 360, baselinePaceSecPerKm: 360,
      adaptiveRatePct: 1, referenceDistanceKm: 5, paceCheckWeekday: 3,
      startDate: '2026-04-06', endDate: '2026-05-10', recoveryEveryWeeks: 4,
    },
    activities: [
      run('2026-04-08', 350, 10),
      run('2026-04-15', 345, 5, { paceCheck: true }),
      run('2026-04-16', 350, 6),
    ],
  });
  assert.equal(evaluation.weeks[1].distanceKm, 11);
  assert.equal(evaluation.weeks[1].weeklyDistanceSpike, false);
  assert.equal(evaluation.weeks[1].holdReason, null);
  assert.ok(evaluation.weeks[1].nextTargetPaceSecPerKm < evaluation.weeks[1].targetPaceSecPerKm);
});

test('a partial opening calendar week cannot trigger the weekly distance spike hold', () => {
  const evaluation = evaluateRunningPaceGoal({
    season: { startDate: '2026-04-12', endDate: '2026-05-17' },
    todayKey: '2026-04-27',
    plan: {
      paceMode: 'adaptive-weekly', targetPaceSecPerKm: 360, baselinePaceSecPerKm: 360,
      adaptiveRatePct: 1, referenceDistanceKm: 5, paceCheckWeekday: 3,
      startDate: '2026-04-12', endDate: '2026-05-17', recoveryEveryWeeks: 0,
    },
    activities: [
      run('2026-04-12', 350, 5),
      run('2026-04-15', 345, 4, { paceCheck: true }),
      run('2026-04-16', 350, 4),
    ],
  });
  assert.equal(evaluation.weeks[1].previousWeekDistanceKm, 5);
  assert.equal(evaluation.weeks[1].previousWeekComplete, false);
  assert.equal(evaluation.weeks[1].weeklyDistanceSpike, false);
  assert.equal(evaluation.weeks[1].holdReason, null);
  assert.ok(evaluation.weeks[1].nextTargetPaceSecPerKm < evaluation.weeks[1].targetPaceSecPerKm);
});
