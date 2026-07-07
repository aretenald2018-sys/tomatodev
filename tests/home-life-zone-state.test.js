import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignLifeZoneSlots,
  formatLifeZoneDateLabel,
  getLifeZoneAccountDisplayName,
  getLifeZoneDietSpeech,
  getLifeZoneOwnerIdCandidates,
  getLifeZoneRunningMapData,
  getLifeZoneRunningSpeech,
  getLifeZoneSpeech,
  getLifeZoneTitleNames,
  getLifeZoneWorkoutSpeech,
  hasLifeZoneDietActivity,
  hasLifeZoneActiveRunning,
  hasLifeZoneRunningActivity,
  hasLifeZoneWorkoutActivity,
  normalizeLifeZoneName,
  resolveLifeZoneActivity,
  resolveLifeZoneActors,
  resolveLifeZoneConsultingVisitor,
  resolveLifeZoneRoster
} from '../home/life-zone-state.js';

test('normalizes Korean and latin display names for matching', () => {
  assert.equal(normalizeLifeZoneName('문정_토마토 (Guest)'), '문정토마토');
  assert.equal(normalizeLifeZoneName('Lee-Jaeheon'), 'leejaeheon');
});

test('formats life zone title date with the year', () => {
  assert.equal(formatLifeZoneDateLabel(new Date('2026-07-02T12:00:00')), '2026년 7월 2일');
});

test('resolves consulting visitor state for new and returning current users', () => {
  const now = Date.UTC(2026, 6, 1, 0, 0, 0);

  const returning = resolveLifeZoneConsultingVisitor({
    currentUser: { id: 'u1', nickname: '복귀토마토', createdAt: now - 90 * 86400000 },
    previousLastLoginAt: now - 11 * 86400000,
    now
  });
  assert.equal(returning.state, 'returning');
  assert.equal(returning.daysAway, 11);
  assert.equal(returning.displayName, '복귀토마토');

  const firstVisit = resolveLifeZoneConsultingVisitor({
    currentUser: { id: 'u2', nickname: '새싹토마토', createdAt: now - 2 * 86400000 },
    previousLastLoginAt: 0,
    now
  });
  assert.equal(firstVisit.state, 'new');
  assert.equal(firstVisit.accountAgeDays, 2);
  assert.equal(firstVisit.displayName, '새싹토마토');

  assert.equal(resolveLifeZoneConsultingVisitor({
    currentUser: { id: 'u3', createdAt: now - 30 * 86400000 },
    previousLastLoginAt: now - 2 * 86400000,
    now
  }), null);

  const currentVisitor = resolveLifeZoneConsultingVisitor({
    currentUser: { id: 'u3', nickname: '오늘방문', createdAt: now - 30 * 86400000 },
    previousLastLoginAt: now - 2 * 86400000,
    showCurrentUser: true,
    now
  });
  assert.equal(currentVisitor.state, 'current');
  assert.equal(currentVisitor.userId, 'u3');
  assert.equal(currentVisitor.displayName, '오늘방문');

  assert.equal(resolveLifeZoneConsultingVisitor({
    currentUser: { id: 'u4(guest)', createdAt: now },
    previousLastLoginAt: 0,
    now
  }), null);
});

test('resolves life zone account display names for visitor nameplates', () => {
  assert.equal(getLifeZoneAccountDisplayName({ id: 'u1', resolvedNickname: '해결닉' }), '해결닉');
  assert.equal(getLifeZoneAccountDisplayName({ id: 'u2', nickname: '닉네임' }), '닉네임');
  assert.equal(getLifeZoneAccountDisplayName({ id: 'u3', lastName: '김', firstName: '토마토(Guest)' }), '김토마토');
  assert.equal(getLifeZoneAccountDisplayName({ id: 'u4' }), 'u4');
});

test('matches roster by resolved nickname and reads fixed actors globally', () => {
  const roster = resolveLifeZoneRoster({
    accounts: [
      { id: 'u1', resolvedNickname: '줍스' },
      { id: 'u2', resolvedNickname: '문정토마토' },
      { id: 'u3', resolvedNickname: '이재헌' }
    ],
    friends: [{ friendId: 'u2' }],
    currentUser: { id: 'u1' }
  });

  assert.deepEqual(roster.map((actor) => actor.source), ['self', 'friend', 'global']);
  assert.deepEqual(roster.map((actor) => actor.canRead), [true, true, true]);
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

test('adds current user outside the fixed life zone roster', () => {
  const actors = resolveLifeZoneActors({
    accounts: [
      { id: 'new-user-1', nickname: '새싹토마토', resolvedNickname: '새싹토마토', firstName: '회원', lastName: '신규' }
    ],
    currentUser: { id: 'new-user-1' },
    dayByAccountId: {
      'new-user-1': { lFoods: [{ name: '샐러드' }], lKcal: 420 }
    }
  });

  const selfActor = actors.find((actor) => actor.accountId === 'new-user-1');
  assert.ok(selfActor);
  assert.equal(selfActor.displayName, '새싹토마토');
  assert.equal(selfActor.source, 'self');
  assert.equal(selfActor.state, 'diet');
  assert.equal(selfActor.speech, '점심냠냠');
  assert.deepEqual(getLifeZoneTitleNames(actors), ['줍스', '문정토마토', '이재헌', '새싹토마토']);

  const idleActors = resolveLifeZoneActors({
    currentUser: { id: 'new-user-1', nickname: '새싹토마토' }
  });
  const idleSelfActor = idleActors.find((actor) => actor.accountId === 'new-user-1');
  assert.equal(idleSelfActor?.slot.id, 'lounge-lower-right');
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

test('detects running activity and keeps active running as home track priority', () => {
  assert.equal(hasLifeZoneRunningActivity({ running: true }), true);
  assert.equal(hasLifeZoneRunningActivity({ runData: { route: [{ lat: 37.1, lng: 127.1 }] } }), true);
  assert.equal(hasLifeZoneRunningActivity({ runLiveActive: true }), true);
  assert.equal(hasLifeZoneActiveRunning({ running: true }), false);
  assert.equal(hasLifeZoneActiveRunning({ runLiveActive: true }), true);
  assert.equal(hasLifeZoneActiveRunning({ runStartedAt: 1000, runEndedAt: 2000 }), false);
  assert.equal(hasLifeZoneActiveRunning({ runStartedAt: 1000 }), true);
  assert.equal(resolveLifeZoneActivity({
    runLiveActive: true,
    exercises: [{ sets: [{ done: true }] }],
    lKcal: 620
  }), 'running');
  assert.equal(getLifeZoneRunningSpeech({ running: true }), '러닝중');
});

test('resolves saved running plus workout as workout unless running is active', () => {
  const savedRunAndWorkout = {
    running: true,
    runRoute: [{ lat: 37.5209, lng: 126.977, ts: 1000 }],
    runRouteSummary: { pointCount: 1 },
    exercises: [{ muscleId: 'chest', sets: [{ done: true }] }]
  };

  assert.equal(resolveLifeZoneActivity(savedRunAndWorkout), 'workout');
  assert.equal(resolveLifeZoneActivity({
    ...savedRunAndWorkout,
    runLiveActive: true
  }), 'running');
  assert.equal(resolveLifeZoneActivity({
    ...savedRunAndWorkout,
    runStartedAt: 1000,
    runEndedAt: undefined
  }), 'running');
});

test('keeps saved running-only records on the running track', () => {
  const savedRunOnly = {
    running: true,
    runRoute: [{ lat: 37.5209, lng: 126.977, ts: 1000 }],
    runRouteSummary: { pointCount: 1 }
  };

  assert.equal(resolveLifeZoneActivity(savedRunOnly), 'running');

  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u1', resolvedNickname: '줍스' }],
    currentUser: { id: 'u1' },
    dayByAccountId: { u1: savedRunOnly }
  });
  const selfActor = actors.find((actor) => actor.accountId === 'u1');

  assert.equal(selfActor?.state, 'running');
  assert.equal(selfActor?.slot.id, 'track-bottom-left');
  assert.equal(selfActor?.sprite, 'jups-running-track.png');
  assert.equal(selfActor?.workoutSlotId, null);
  assert.equal(selfActor?.runningMap?.pointCount, 1);
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

  assert.deepEqual(assigned.map((actor) => actor.slot.id), ['bench', 'lat', 'squat']);
  assert.deepEqual(assigned.map((actor) => actor.sprite), [
    'jups-workout-bench.png',
    'moonjung-tomato-workout-lat.png',
    'lee-jaeheon-workout-squat.png'
  ]);
});

test('assigns workout actors to weight stations by muscle preference with occupied-slot fallback', () => {
  const musclePreferredActors = resolveLifeZoneActors({
    accounts: [
      { id: 'u1', resolvedNickname: '줍스' },
      { id: 'u2', resolvedNickname: '문정토마토' },
      { id: 'u3', resolvedNickname: '이재헌' }
    ],
    friends: [{ friendId: 'u2' }, { friendId: 'u3' }],
    currentUser: { id: 'u1' },
    dayByAccountId: {
      u1: { exercises: [{ muscleId: 'chest', sets: [{ done: true }] }] },
      u2: { exercises: [{ muscleId: 'glute', sets: [{ done: true }] }] },
      u3: { exercises: [{ muscleId: 'back', sets: [{ done: true }] }] }
    }
  });

  assert.deepEqual(musclePreferredActors.map((actor) => actor.slot.id), ['bench', 'squat', 'lat']);
  assert.deepEqual(musclePreferredActors.map((actor) => actor.sprite), [
    'jups-workout-bench.png',
    'moonjung-tomato-workout-squat.png',
    'lee-jaeheon-workout-lat.png'
  ]);

  const fallbackActors = resolveLifeZoneActors({
    accounts: [
      { id: 'u1', resolvedNickname: '줍스' },
      { id: 'u2', resolvedNickname: '문정토마토' },
      { id: 'u3', resolvedNickname: '이재헌' }
    ],
    friends: [{ friendId: 'u2' }, { friendId: 'u3' }],
    currentUser: { id: 'u1' },
    dayByAccountId: {
      u1: { exercises: [{ muscleId: 'chest', sets: [{ done: true }] }] },
      u2: { exercises: [{ muscleId: 'chest', sets: [{ done: true }] }] },
      u3: { exercises: [{ sets: [{ done: true }] }] }
    }
  });

  assert.deepEqual(fallbackActors.map((actor) => actor.slot.id), ['bench', 'lat', 'squat']);
  assert.equal(new Set(fallbackActors.map((actor) => actor.slot.id)).size, 3);
});

test('assigns running actors to existing home track slots and running sprite sheets', () => {
  const assigned = assignLifeZoneSlots([
    { id: 'a', spritePrefix: 'jups', state: 'running' },
    { id: 'b', spritePrefix: 'moonjung-tomato', state: 'running' },
    { id: 'c', spritePrefix: 'lee-jaeheon', state: 'running' }
  ]);

  assert.deepEqual(assigned.map((actor) => actor.slot.id), ['track-bottom-left', 'track-bottom-center', 'track-bottom-right']);
  assert.deepEqual(assigned.map((actor) => [actor.slot.x, actor.slot.y, actor.slot.width]), [
    [156, 1098, 118],
    [352, 1138, 126],
    [650, 1100, 108]
  ]);
  assert.deepEqual(assigned.map((actor) => actor.slot.labelY), [1076, 1114, 1078]);
  assert.deepEqual(assigned.map((actor) => actor.slot.bubbleY), [1076, 1116, 1078]);
  assert.ok(assigned[1].slot.width > assigned[0].slot.width);
  assert.ok(assigned[0].slot.width > assigned[2].slot.width);
  assert.ok(assigned.every((actor) => !('runX0' in actor.slot) && !('runX1' in actor.slot)));
  assert.deepEqual(assigned.map((actor) => actor.sprite), [
    'jups-running-track.png',
    'moonjung-tomato-running-track.png',
    'lee-jaeheon-running-track.png'
  ]);
  assert.ok(assigned.every((actor) => actor.slot.pose === 'running-track'));
});

test('builds life zone running map data from live and saved routes', () => {
  const live = getLifeZoneRunningMapData({
    runLiveActive: true,
    lifeZoneRunningRoute: [
      { lat: 37.5209, lng: 126.977, ts: 1000 },
      { lat: 37.5215, lng: 126.979, ts: 2000 }
    ],
    lifeZoneRunningRouteSummary: { pointCount: 2, centroid: { lat: 37.5212, lng: 126.978 } },
    lifeZoneRunningPreviewPoint: { lat: 37.5215, lng: 126.979 },
    lifeZoneRunningPlaceSummary: {
      label: '서울특별시 송파구 방이동',
      adminArea: { city: '서울특별시', district: '송파구', dong: '방이동' }
    }
  });

  assert.equal(live.live, true);
  assert.equal(live.route.length, 2);
  assert.deepEqual(live.previewPoint, { lat: 37.5215, lng: 126.979 });
  assert.equal(live.pointCount, 2);
  assert.equal(live.placeLabel, '방이동 · 송파구');

  const saved = getLifeZoneRunningMapData({
    running: true,
    runPlaceSummary: { label: '서울특별시 송파구 오금동' },
    runData: {
      route: [{ latitude: 37.1, longitude: 127.1 }],
      routeSummary: { pointCount: 1 }
    }
  });

  assert.equal(saved.live, false);
  assert.deepEqual(saved.route, [{ lat: 37.1, lng: 127.1 }]);
  assert.equal(saved.pointCount, 1);
  assert.equal(saved.placeLabel, '오금동 · 송파구');
});

test('life zone running map does not show a location placeholder before geocode resolves', () => {
  const data = getLifeZoneRunningMapData({
    runData: {
      route: [{ lat: 37.1, lng: 127.1 }],
      routeSummary: { pointCount: 1 }
    }
  });

  assert.equal(data.placeLabel, '');
  assert.equal(data.pointCount, 1);
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
  assert.deepEqual(actors.map((actor) => actor.slot.id), ['bench', 'island-left', 'desk-upper']);
  assert.deepEqual(actors.map((actor) => actor.speech), ['오늘 운동 완료', '점심냠냠', '다른 일 하는중']);
});

test('global life zone roster actors use recent activity without friendship', () => {
  const actors = resolveLifeZoneActors({
    accounts: [
      { id: 'u1', resolvedNickname: '줍스' },
      { id: 'u2', resolvedNickname: '문정토마토' },
      { id: 'u3', resolvedNickname: '이재헌' }
    ],
    friends: [],
    currentUser: { id: 'u4', nickname: '방문자' },
    dayByAccountId: {
      u1: { lFoods: [{ name: 'salad' }], lKcal: 420 },
      u2: { exercises: [{ muscleId: 'chest', sets: [{ done: true }] }] },
      u3: {}
    }
  });

  assert.deepEqual(actors.map((actor) => actor.source), ['global', 'global', 'global', 'self']);
  assert.deepEqual(actors.map((actor) => actor.state), ['diet', 'workout', 'office', 'office']);
  assert.deepEqual(actors.map((actor) => actor.speech), ['점심냠냠', '오늘 가슴 완료', '다른 일 하는중', '다른 일 하는중']);
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

test('treats live running as the home track running state', () => {
  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u1', resolvedNickname: '줍스' }],
    currentUser: { id: 'u1' },
    dayByAccountId: {
      u1: { runLiveActive: true, exercises: [{ sets: [{ done: true }] }] }
    }
  });

  assert.equal(actors[0].displayName, '줍스');
  assert.equal(actors[0].state, 'running');
  assert.equal(actors[0].slot.id, 'track-bottom-left');
  assert.equal(actors[0].sprite, 'jups-running-track.png');
  assert.equal(actors[0].speech, '러닝중');
  assert.equal(actors[0].runningMap.live, true);
});

test('latest lunch snapshot overrides a saved running record in life zone', () => {
  const day = {
    running: true,
    runRoute: [{ lat: 37.5209, lng: 126.977, ts: 1000 }],
    runRouteSummary: { pointCount: 1 },
    lunch: '샐러드',
    lKcal: 620,
    lifeZoneDietActivity: { state: 'diet', meal: 'lunch', updatedAt: 3000 },
    lifeZoneLastActivity: { state: 'diet', meal: 'lunch', updatedAt: 3000 }
  };
  const actors = resolveLifeZoneActors({
    accounts: [{ id: 'u2', resolvedNickname: '문정토마토' }],
    currentUser: { id: 'u2' },
    dayByAccountId: { u2: day }
  });

  assert.equal(resolveLifeZoneActivity(day), 'diet');
  assert.equal(getLifeZoneSpeech(day), '점심냠냠');
  assert.equal(actors[1].displayName, '문정토마토');
  assert.equal(actors[1].state, 'diet');
  assert.equal(actors[1].slot.id, 'island-left');
  assert.equal(actors[1].speech, '점심냠냠');

  assert.equal(resolveLifeZoneActivity({ ...day, runLiveActive: true }), 'running');
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
