import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignLifeZoneSlots,
  getLifeZoneDietSpeech,
  getLifeZoneOwnerIdCandidates,
  getLifeZoneSpeech,
  getLifeZoneWorkoutSpeech,
  hasLifeZoneDietActivity,
  hasLifeZoneWorkoutActivity,
  normalizeLifeZoneName,
  resolveLifeZoneActors,
  resolveLifeZoneRoster
} from '../home/life-zone-state.js';

test('normalizes Korean and latin display names for matching', () => {
  assert.equal(normalizeLifeZoneName('문정_토마토 (Guest)'), '문정토마토');
  assert.equal(normalizeLifeZoneName('Lee-Jaeheon'), 'leejaeheon');
});

test('matches roster by resolved nickname and only reads self or friends', () => {
  const roster = resolveLifeZoneRoster({
    accounts: [
      { id: 'u1', resolvedNickname: '줍스' },
      { id: 'u2', resolvedNickname: '문정토마토' },
      { id: 'u3', resolvedNickname: '이재헌' }
    ],
    friends: [{ friendId: 'u2' }],
    currentUser: { id: 'u1' }
  });

  assert.deepEqual(roster.map((actor) => actor.source), ['self', 'friend', 'unreadable']);
  assert.deepEqual(roster.map((actor) => actor.canRead), [true, true, false]);
});

test('matches readable roster through guest owner id candidates', () => {
  const roster = resolveLifeZoneRoster({
    accounts: [
      { id: '줍스', resolvedNickname: '줍스' }
    ],
    friends: [{ friendId: '줍스(guest)' }],
    currentUser: { id: '문정토마토' }
  });

  assert.deepEqual(getLifeZoneOwnerIdCandidates('줍스'), ['줍스', '줍스(guest)']);
  assert.equal(roster[0].source, 'friend');
  assert.equal(roster[0].canRead, true);
  assert.equal(roster[0].readAccountId, '줍스(guest)');
});

test('detects workout and diet activities from workout day documents', () => {
  assert.equal(hasLifeZoneWorkoutActivity({
    exercises: [{ sets: [{ kg: 60, reps: 8 }] }]
  }), true);
  assert.equal(hasLifeZoneWorkoutActivity({ workoutDuration: 1800 }), true);
  assert.equal(hasLifeZoneWorkoutActivity({ workoutTimeline: { durationSec: 0, checkedSetCount: 1 } }), true);
  assert.equal(hasLifeZoneWorkoutActivity({
    exercises: [{ sets: [{ kg: 0, reps: 10, done: false }] }]
  }), false);
  assert.equal(hasLifeZoneDietActivity({ bFoods: [{ name: 'salad' }] }), true);
  assert.equal(hasLifeZoneDietActivity({ sKcal: 120 }), true);
});

test('builds life zone workout speech with large muscles only', () => {
  assert.equal(getLifeZoneWorkoutSpeech({
    exercises: [
      { movementId: 'lat_pulldown', sets: [{ done: true }] },
      { movementId: 'cable_curl', sets: [{ done: true }] },
      { movementId: 'cable_crunch', sets: [{ done: true }] }
    ]
  }), '오늘 등 완료');

  assert.equal(getLifeZoneWorkoutSpeech({
    exercises: [
      { muscleId: 'back', sets: [{ kg: 40, reps: 10 }] },
      { muscleId: 'chest', sets: [{ kg: 60, reps: 8 }] }
    ]
  }), '오늘 가슴/등 완료');
});

test('builds life zone diet and office speech', () => {
  assert.equal(getLifeZoneDietSpeech({ breakfast: '계란' }), '아침냠냠');
  assert.equal(getLifeZoneDietSpeech({ breakfast: '계란', lFoods: [{ name: 'salad' }] }), '점심냠냠');
  assert.equal(getLifeZoneDietSpeech({ breakfast: '계란', lFoods: [{ name: 'salad' }], sKcal: 120 }), '간식냠냠');
  assert.equal(getLifeZoneSpeech({}, 'office'), '다른 일 하는중');
});

test('assigns separate slots for three actors in the same state', () => {
  const assigned = assignLifeZoneSlots([
    { id: 'a', spritePrefix: 'jups', state: 'workout' },
    { id: 'b', spritePrefix: 'moonjung-tomato', state: 'workout' },
    { id: 'c', spritePrefix: 'lee-jaeheon', state: 'workout' }
  ]);

  assert.deepEqual(assigned.map((actor) => actor.slot.id), ['lat', 'bench', 'squat']);
  assert.deepEqual(assigned.map((actor) => actor.sprite), [
    'jups-workout-lat.png',
    'moonjung-tomato-workout-bench.png',
    'lee-jaeheon-workout-squat.png'
  ]);
});

test('resolves activity priority and slot distribution from account days', () => {
  const actors = resolveLifeZoneActors({
    accounts: [
      { id: 'u1', resolvedNickname: '줍스' },
      { id: 'u2', resolvedNickname: '문정토마토' },
      { id: 'u3', resolvedNickname: '이재헌' }
    ],
    friends: [{ friendId: 'u2' }, { friendId: 'u3' }],
    currentUser: { id: 'u1' },
    dayByAccountId: {
      u1: { exercises: [{ sets: [{ done: true }] }], bKcal: 400 },
      u2: { lKcal: 620 },
      u3: {}
    }
  });

  assert.deepEqual(actors.map((actor) => actor.state), ['workout', 'diet', 'office']);
  assert.deepEqual(actors.map((actor) => actor.slot.id), ['lat', 'island-left', 'desk-upper']);
  assert.deepEqual(actors.map((actor) => actor.speech), ['오늘 운동 완료', '점심냠냠', '다른 일 하는중']);
});

test('treats duration-only workout as workout state in life zone', () => {
  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u1', resolvedNickname: '줍스' }],
    currentUser: { id: 'u1' },
    dayByAccountId: {
      u1: { workoutDuration: 1800 }
    }
  });

  assert.equal(actors[0].displayName, '줍스');
  assert.equal(actors[0].state, 'workout');
  assert.equal(actors[0].speech, '오늘 운동 완료');
});

test('treats diet-only Jups record as diet state in life zone', () => {
  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u1', resolvedNickname: '줍스' }],
    currentUser: { id: 'u1' },
    dayByAccountId: {
      u1: { lFoods: [{ name: 'salad' }], lKcal: 420 }
    }
  });

  assert.equal(actors[0].displayName, '줍스');
  assert.equal(actors[0].state, 'diet');
  assert.equal(actors[0].slot.id, 'island-left');
  assert.equal(actors[0].speech, '점심냠냠');
});

test('uses the latest life zone activity snapshot when workout and snack both exist', () => {
  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u2', resolvedNickname: '문정토마토' }],
    currentUser: { id: 'u2' },
    dayByAccountId: {
      u2: {
        exercises: [{ muscleId: 'chest', sets: [{ done: true }] }],
        dinner: '닭가슴살',
        snack: '프로틴바',
        sKcal: 180,
        lifeZoneWorkoutActivity: { state: 'workout', updatedAt: 1000 },
        lifeZoneDietActivity: { state: 'diet', meal: 'snack', updatedAt: 2000 },
        lifeZoneLastActivity: { state: 'diet', meal: 'snack', updatedAt: 2000 }
      }
    }
  });

  assert.equal(actors[1].displayName, '문정토마토');
  assert.equal(actors[1].state, 'diet');
  assert.equal(actors[1].slot.id, 'island-left');
  assert.equal(actors[1].speech, '간식냠냠');
});

test('uses lifeZoneLastActivity meal over default meal order for diet speech', () => {
  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u2', resolvedNickname: '문정토마토' }],
    currentUser: { id: 'u2' },
    dayByAccountId: {
      u2: {
        exercises: [{ muscleId: 'chest', sets: [{ done: true }] }],
        lunch: '샐러드',
        dinner: '닭가슴살',
        lifeZoneLastActivity: { state: 'diet', meal: 'lunch', updatedAt: 3000 }
      }
    }
  });

  assert.equal(actors[1].state, 'diet');
  assert.equal(actors[1].speech, '점심냠냠');
});

test('falls back to workout priority when life zone snapshots are absent', () => {
  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u2', resolvedNickname: '문정토마토' }],
    currentUser: { id: 'u2' },
    dayByAccountId: {
      u2: {
        exercises: [{ muscleId: 'chest', sets: [{ done: true }] }],
        snack: '프로틴바',
        sKcal: 180
      }
    }
  });

  assert.equal(actors[1].state, 'workout');
  assert.equal(actors[1].speech, '오늘 가슴 완료');
});
