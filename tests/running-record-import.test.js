import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildImportedRunningSession,
  normalizeRunningRecordParse,
  planImportedRunningRecordSave,
} from '../workout/running-record-import.js';

const NOW = new Date(2026, 6, 14, 12, 0, 0).getTime();

test('Nike result screenshot parse normalizes metrics into running schema', () => {
  const record = normalizeRunningRecordParse({
    isRunningRecord: true,
    sourceApp: 'Nike Run Club',
    title: '화요일 아침 러닝',
    observedDate: '오늘',
    startTime: '오전 6:52',
    distanceKm: '5.50',
    duration: '35:18',
    avgPace: "6'25\"",
    calories: '382 kcal',
    elevationGainM: '33 m',
    avgHeartRateBpm: null,
    cadenceSpm: 119,
    location: '송파구, 서울특별시',
    routeMapVisible: true,
    routeMapCrop: { x: 0.06, y: 0.68, width: 0.88, height: 0.3 },
    confidence: 0.98,
  }, { targetDateKey: '2026-07-14', now: NOW, provider: 'gemini' });

  assert.equal(record.distanceKm, 5.5);
  assert.equal(record.durationSec, 2118);
  assert.equal(record.avgPaceSecPerKm, 385);
  assert.equal(record.startTime, '06:52');
  assert.equal(new Date(record.startedAt).getHours(), 6);
  assert.equal(record.calories, 382);
  assert.equal(record.cadenceSpm, 119);
  assert.deepEqual(record.mapCrop, { x: 0.06, y: 0.68, width: 0.88, height: 0.3 });
  assert.match(record.fingerprint, /^running-screenshot-v1\|2026-07-14\|06:52\|5\.500\|2118$/);
});

test('long result screenshot preserves full and partial kilometer splits', () => {
  const record = normalizeRunningRecordParse({
    isRunningRecord: true,
    distanceKm: 5.5,
    durationSec: 2118,
    avgPaceSecPerKm: 385,
    splits: [
      { distanceKm: 1, paceSecPerKm: 427, elevationM: -5 },
      { distanceKm: 1, paceSecPerKm: 503, elevationM: 0 },
      { distanceKm: 1, paceSecPerKm: 579, elevationM: 5 },
      { distanceKm: 1, paceSecPerKm: 368, elevationM: 0 },
      { distanceKm: 1, paceSecPerKm: 116, elevationM: 6 },
      { distanceKm: 0.5, paceSecPerKm: 251, elevationM: 4 },
    ],
  }, { targetDateKey: '2026-07-14', now: NOW });

  assert.equal(record.splits.length, 6);
  assert.equal(record.splits[5].distanceKm, 0.5);
  assert.equal(record.splits[5].durationSec, 126);
  assert.equal(record.splits[0].elevationGainM, -5);
  assert.equal(record.bestPaceSecPerKm, 116);
});

test('import session is running-only and trusts calories shown by the source app', () => {
  const record = normalizeRunningRecordParse({
    isRunningRecord: true,
    distanceKm: 5.5,
    durationSec: 2118,
    calories: 382,
    title: '화요일 아침 러닝',
  }, { targetDateKey: '2026-07-14', now: NOW });
  record.mapImageDataUrl = 'data:image/webp;base64,AAAA';
  const session = buildImportedRunningSession(record);

  assert.equal(session.running, true);
  assert.equal(session.exercises.length, 0);
  assert.equal(session.runSource, 'screenshot-import');
  assert.equal(session.runDurationMin, 35);
  assert.equal(session.runDurationSec, 18);
  assert.equal(session.runRoute.length, 0);
  assert.equal(session.runRouteSummary.calorieSource, 'device');
  assert.equal(session.runRouteSummary.pointCount, 0);
  assert.equal(session.runRouteSummary.mapImageDataUrl, 'data:image/webp;base64,AAAA');
  assert.equal(session.runRouteSummary.mapImageSource, 'screenshot-crop');
});

test('save plan preserves gym and diet data while deduplicating the same screenshot', () => {
  const record = normalizeRunningRecordParse({
    isRunningRecord: true,
    distanceKm: 5.5,
    durationSec: 2118,
    startTime: '06:52',
  }, { targetDateKey: '2026-07-14', now: NOW });
  const day = {
    breakfast: '사과',
    bPhoto: 'data:image/jpeg;base64,keep-me',
    exercises: [{ name: '스쿼트', sets: [{ kg: 100, reps: 5, done: true }] }],
    workoutPhoto: 'data:image/jpeg;base64,workout-photo',
  };

  const first = planImportedRunningRecordSave(day, record, { now: NOW });
  assert.equal(first.sessionIndex, 2);
  assert.equal(first.payload.workoutSessions[0].exercises[0].name, '스쿼트');
  assert.equal(first.payload.workoutPhoto, 'data:image/jpeg;base64,workout-photo');
  assert.equal(Object.hasOwn(first.payload, 'breakfast'), false);
  assert.equal(Object.hasOwn(first.payload, 'bPhoto'), false);

  const updatedDay = { ...day, ...first.payload };
  const second = planImportedRunningRecordSave(updatedDay, { ...record, calories: 400 }, { now: NOW + 1000 });
  assert.equal(second.sessionIndex, 2);
  assert.equal(second.payload.workoutSessions.filter(session => session.running).length, 1);
  assert.equal(second.payload.workoutSessions[2].runRouteSummary.calories, 400);
});

test('non-running and incomplete screenshots are rejected before save', () => {
  assert.throws(() => normalizeRunningRecordParse({ isRunningRecord: false }, {
    targetDateKey: '2026-07-14', now: NOW,
  }), /러닝 결과/);
  assert.throws(() => normalizeRunningRecordParse({ isRunningRecord: true, distanceKm: 5.5 }, {
    targetDateKey: '2026-07-14', now: NOW,
  }), /거리와 시간/);
});
