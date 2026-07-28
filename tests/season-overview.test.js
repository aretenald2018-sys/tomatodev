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
  // 7/1(수)~7/21 시즌은 달력 주 기준으로 6/29·7/6·7/13·7/20 네 주에 걸친다.
  assert.equal(snapshot.weeks.length, 4);
  assert.ok(snapshot.weeks[0].items.some(item => item.kind === 'strength'));
  assert.ok(snapshot.weeks[0].items.some(item => item.kind === 'running'));
  assert.equal(snapshot.weeks[0].state, 'partial');
  assert.ok(['planned', 'not-achieved'].includes(snapshot.weeks[1].state));
});

test('863로 저장된 레거시 종목은 성장보드 트랙이 아니라 웬들러 주차 처방을 보여준다', () => {
  const snapshot = buildSeasonOverview({
    todayKey: '2026-07-12',
    season: { id: 'summer-863', name: '863 시즌', startDate: '2026-07-01', endDate: '2026-07-21' },
    board: {
      seasonId: 'summer-863',
      benchmarks: [{ id: 'sumo-1', label: '스모 데드리프트', status: 'active', program: '863', groupId: 'lower', movementId: 'deadlift', wendler: { oneRmKg: 150, scheme: 'w863' } }],
      cycles: [{ id: 'cycle-1', groupId: 'lower', status: 'active', startDate: '2026-07-01', weeks: 7 }],
      steps: [],
    },
  });
  const item = snapshot.weeks[0].items.find(row => row.label === '스모 데드리프트');
  assert.ok(item);
  assert.match(item.detail, /웬들러/);
  assert.doesNotMatch(item.detail, /이번 주 처방 없음/);
});

test('웬들러 종목을 색칠한 주는 달성으로 잡힌다 (wendlerLog를 읽는다)', () => {
  const board = {
    seasonId: 'summer-863',
    benchmarks: [
      {
        id: 'squat-wide',
        label: '스쿼트(와이드)',
        status: 'active',
        program: '863',
        groupId: 'lower',
        movementId: 'squat',
        wendler: { oneRmKg: 130, scheme: 'w863' },
        // 보드에서 색칠하면 여기에 기록된다 (step.weekLog가 아니다)
        wendlerLog: { '2026-06-29': { paintedAt: 1784000000000, amrapReps: 7 } },
      },
    ],
    cycles: [{ id: 'cycle-1', groupId: 'lower', status: 'active', startDate: '2026-07-01', weeks: 7 }],
    steps: [],
  };
  const snapshot = buildSeasonOverview({
    todayKey: '2026-07-03',
    season: { id: 'summer-863', name: '863 시즌', startDate: '2026-07-01', endDate: '2026-07-21' },
    board,
  });
  const week = snapshot.weeks[0];
  assert.equal(week.goalWeekStart, '2026-06-29');
  const item = week.items.find(row => row.label === '스쿼트(와이드)');
  assert.ok(item);
  assert.equal(item.state, 'achieved');
  assert.ok(week.achievedCount >= 1);
});

test('색칠하지 않은 웬들러 종목은 달성으로 잡히지 않는다', () => {
  const snapshot = buildSeasonOverview({
    todayKey: '2026-07-03',
    season: { id: 'summer-863', name: '863 시즌', startDate: '2026-07-01', endDate: '2026-07-21' },
    board: {
      seasonId: 'summer-863',
      benchmarks: [{ id: 'squat-wide', label: '스쿼트(와이드)', status: 'active', program: '863', groupId: 'lower', movementId: 'squat', wendler: { oneRmKg: 130, scheme: 'w863' } }],
      cycles: [{ id: 'cycle-1', groupId: 'lower', status: 'active', startDate: '2026-07-01', weeks: 7 }],
      steps: [],
    },
  });
  const item = snapshot.weeks[0].items.find(row => row.label === '스쿼트(와이드)');
  assert.ok(item);
  assert.equal(item.state, 'not-achieved');
});

// 시즌이 월요일에 시작하지 않으면 주차 구간과 그 주차를 그릴 달력 행이 어긋났다.
// 7/15(수) 시작 시즌에서 오늘(7/28)이 든 주차는 7/22~7/28인데 앵커는 7/20이라
// 한 행 위에 그려졌고, 오늘이 든 달력 행에는 아직 시작도 안 한 다음 주차가 올라왔다.
test('시즌 주차는 달력 주에 맞춰 끊겨 오늘이 든 주차가 오늘 행에 올라온다', () => {
  const todayKey = '2026-07-28';
  const snapshot = buildSeasonOverview({
    todayKey,
    season: { id: 'wed-season', name: '수요일 시작 시즌', startDate: '2026-07-15', endDate: '2026-08-31' },
    runningPlan: { weeklyDistanceKm: 10, weeklySessions: 2 },
    board: {
      benchmarks: [{ id: 'squat-1', label: '스쿼트(와이드)', status: 'active', tracks: ['volume'] }],
      steps: [{ benchmarkId: 'squat-1', track: 'volume', weekStart: '2026-07-13', span: 8, kg: 103.8, reps: 3, weekLog: {} }],
    },
    cache: {},
  });

  // 주차 경계는 모두 월요일이고, 앵커는 그 주의 월요일 그대로다.
  const current = snapshot.weeks.find(week => week.startDate <= todayKey && todayKey <= week.endDate);
  assert.ok(current, '오늘이 든 주차가 있어야 한다');
  assert.equal(current.startDate, '2026-07-27');
  assert.equal(current.endDate, '2026-08-02');
  // 달력은 오늘이 든 행에서 startOfSeasonWeek(수요일)=2026-07-27 앵커를 찾는다.
  assert.equal(current.goalWeekStart, '2026-07-27');

  // 시즌 첫 주는 시작일 앞을 잘라 내되 앵커는 그 주 월요일을 유지한다.
  assert.equal(snapshot.weeks[0].startDate, '2026-07-15');
  assert.equal(snapshot.weeks[0].goalWeekStart, '2026-07-13');
  // 마지막 주는 시즌 종료일에서 잘린다.
  assert.equal(snapshot.weeks.at(-1).endDate, '2026-08-31');

  // 시작한 주차는 헬스도 러닝도 '예정'이 아니다. 예전에는 헬스만 goalWeekStart로
  // 판단해서 같은 주차가 헬스 ×(미달) · 러닝 ·(예정)으로 갈렸다.
  assert.deepEqual(
    [...new Set(current.items.map(item => item.state === 'planned'))],
    [false],
  );
  // 아직 시작 안 한 주차는 모든 항목이 '예정'이다.
  const next = snapshot.weeks.find(week => week.startDate > todayKey);
  assert.ok(next);
  assert.deepEqual([...new Set(next.items.map(item => item.state))], ['planned']);
});
