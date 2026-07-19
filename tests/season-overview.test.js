import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSeasonOverview } from '../data/season-overview.js';

test('시즌 개요는 주차별 헬스·러닝 목표와 달성 상태를 함께 만든다', () => {
  const snapshot = buildSeasonOverview({
    todayKey: '2026-07-12',
    season: { id: 'summer', name: '여름 시즌', startDate: '2026-07-01', endDate: '2026-07-21' },
    runningPlan: { weeklyDistanceKm: 10, weeklySessions: 2 },
    board: {
      benchmarks: [{ id: 'bench-1', label: '벤치프레스', status: 'active', tracks: ['volume'] }],
      steps: [{ benchmarkId: 'bench-1', track: 'volume', weekStart: '2026-06-29', span: 4, kg: 60, reps: 8, weekLog: { '2026-06-29': { paintedAt: 1 } } }],
    },
    cache: {
      '2026-07-01': { workoutSessions: [{ exercises: [{ exerciseId: 'bench', sets: [{ kg: 60, reps: 8, done: true }] }] }] },
      '2026-07-02': { workoutSessions: [{ sessionId: 'running-track', running: true, runDistance: 5, runDurationSec: 1800 }] },
    },
  });
  assert.equal(snapshot.state, 'ready');
  assert.equal(snapshot.weeks.length, 3);
  assert.ok(snapshot.weeks[0].items.some(item => item.kind === 'strength'));
  assert.ok(snapshot.weeks[0].items.some(item => item.kind === 'running'));
  assert.equal(snapshot.weeks[0].state, 'partial');
  assert.ok(['planned', 'not-achieved'].includes(snapshot.weeks[1].state));
});
