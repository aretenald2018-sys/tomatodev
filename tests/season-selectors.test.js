import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calcSeasonWorkoutStreak,
  selectSeasonContext,
  selectSeasonRunningStats,
  selectSeasonStrengthStats,
} from '../data/season-selectors.js';

const REGISTRY = {
  schemaVersion: 2,
  seasons: [
    { id: 'old', name: '이전 시즌', startDate: '2026-05-01', endDate: '2026-06-30' },
    { id: 'current', name: '현재 시즌', startDate: '2026-07-01', endDate: '2026-08-31' },
  ],
};

const liftDay = (kg, reps = 1, exerciseId = 'squat') => ({
  exercises: [{ exerciseId, sets: [{ kg, reps, done: true }] }],
});

const runDay = (distanceKm, durationMin) => ({
  running: true,
  runDistance: distanceKm,
  runDurationMin: durationMin,
  runDurationSec: 0,
});

test('현재 시즌 context는 이전 시즌과 metadata를 의사결정 cache에서 제외한다', () => {
  const cache = {
    '2026-06-30': liftDay(300),
    '2026-07-01': liftDay(100),
    metadata: { shouldNotLeak: true },
  };
  const context = selectSeasonContext(cache, REGISTRY, { dateKey: '2026-07-15' });
  assert.equal(context.season.id, 'current');
  assert.deepEqual(Object.keys(context.cache), ['2026-07-01']);
});

test('시즌 운동 스트릭은 오늘 미완료를 0으로 만들지 않고 시즌 시작에서 멈춘다', () => {
  const cache = {
    '2026-06-30': liftDay(90),
    '2026-07-01': liftDay(100),
    '2026-07-02': {},
  };
  const result = calcSeasonWorkoutStreak(cache, REGISTRY, '2026-07-02');
  assert.deepEqual(result, { current: 1, best: 1, todayDone: false, seasonId: 'current' });
});

test('러닝 selector는 현재 주 목표와 완료된 4주 성장만 현재 시즌 기록으로 계산한다', () => {
  const cache = {
    '2026-05-31': runDay(100, 100),
    '2026-06-15': runDay(5, 30),
    '2026-06-22': runDay(5, 30),
    '2026-06-29': runDay(5, 30),
    '2026-07-06': runDay(6, 33),
    '2026-07-13': runDay(4, 22),
    '2026-07-14': runDay(8, 44),
  };
  const registry = {
    seasons: [{ id: 'long', name: '장기 시즌', startDate: '2026-06-01', endDate: '2026-08-31' }],
  };
  const stats = selectSeasonRunningStats(cache, registry, '2026-07-15', {
    weeklyDistanceKm: 20,
    weeklySessions: 3,
  });
  assert.equal(stats.currentWeek.distance.actual, 12);
  assert.equal(stats.currentWeek.distance.percent, 60);
  assert.equal(stats.currentWeek.sessions.actual, 2);
  assert.equal(stats.trend.status, 'ready');
  assert.equal(stats.trend.distanceDeltaPct, 10);
  assert.equal(stats.trend.paceImprovementSecPerKm, 16);
});

test('헬스 selector는 현재 주 볼륨, 완료 주 성장, 시즌 시작 1RM 차이를 분리한다', () => {
  const cache = {
    '2026-05-31': liftDay(300, 10),
    '2026-06-30': liftDay(100, 10, 'row'),
    '2026-07-06': liftDay(120, 10, 'row'),
    '2026-07-13': liftDay(105, 1),
    '2026-07-14': liftDay(50, 10, 'row'),
  };
  const registry = {
    seasons: [{ id: 'long', name: '장기 시즌', startDate: '2026-06-01', endDate: '2026-08-31' }],
  };
  const stats = selectSeasonStrengthStats(cache, registry, '2026-07-15', {
    weeklySessionTarget: 4,
    startingOneRmByExercise: { squat: 100 },
    exerciseLabels: { squat: '스쿼트' },
  });
  assert.equal(stats.currentWeek.sessions.actual, 2);
  assert.equal(stats.currentWeek.sessions.percent, 50);
  assert.equal(stats.currentWeek.totalVolumeKg, 605);
  assert.equal(stats.volumeTrend.status, 'ready');
  assert.equal(stats.volumeTrend.volumeDeltaPct, 20);
  assert.equal(stats.liftDeltas[0].label, '스쿼트');
  assert.equal(stats.liftDeltas[0].deltaKg, 5);
});

test('표본이 부족하면 성장률을 만들지 않고 collecting 상태를 반환한다', () => {
  const cache = { '2026-07-13': runDay(3, 20) };
  const running = selectSeasonRunningStats(cache, REGISTRY, '2026-07-15', {});
  const strength = selectSeasonStrengthStats(cache, REGISTRY, '2026-07-15', {});
  assert.equal(running.trend.status, 'collecting');
  assert.equal(strength.volumeTrend.status, 'collecting');
});
