import { MOVEMENTS } from '../config.js';

export const LIFE_ZONE_ACTORS = [
  {
    id: 'jups',
    displayName: '줍스',
    spritePrefix: 'jups',
    color: '#ff525c',
    matchNames: ['줍스', 'jups']
  },
  {
    id: 'moonjung-tomato',
    displayName: '문정토마토',
    spritePrefix: 'moonjung-tomato',
    color: '#52a6ff',
    matchNames: ['문정토마토', 'moonjungtomato']
  },
  {
    id: 'lee-jaeheon',
    displayName: '이재헌',
    spritePrefix: 'lee-jaeheon',
    color: '#5ada7e',
    matchNames: ['이재헌', 'leejaeheon']
  }
];

export const LIFE_ZONE_SLOTS = {
  running: [
    {
      id: 'track-upper',
      pose: 'running-track',
      label: '러닝',
      x: 510,
      y: 894,
      width: 94,
      z: 84,
      labelY: 866,
      bubbleX: 562,
      bubbleY: 770,
      mapTipX: 35,
      runDelay: '0s',
      runDuration: '2.22s',
      runX0: '-14px',
      runY0: '10px',
      runX1: '18px',
      runY1: '-10px'
    },
    {
      id: 'track-left',
      pose: 'running-track',
      label: '러닝',
      x: 346,
      y: 1012,
      width: 90,
      z: 90,
      labelY: 984,
      bubbleX: 392,
      bubbleY: 890,
      mapTipX: 52,
      runDelay: '-0.64s',
      runDuration: '2.48s',
      runX0: '16px',
      runY0: '-8px',
      runX1: '-18px',
      runY1: '9px'
    },
    {
      id: 'track-right',
      pose: 'running-track',
      label: '러닝',
      x: 720,
      y: 1030,
      width: 88,
      z: 96,
      labelY: 1002,
      bubbleX: 760,
      bubbleY: 908,
      mapTipX: 48,
      runDelay: '-1.18s',
      runDuration: '2.7s',
      runX0: '-12px',
      runY0: '8px',
      runX1: '16px',
      runY1: '-7px'
    }
  ],
  workout: [
    { id: 'lat', pose: 'workout-lat', label: '랫풀다운', x: 246, y: 260, width: 238, z: 30 },
    { id: 'bench', pose: 'workout-bench', label: '벤치프레스', x: 70, y: 540, width: 260, z: 42 },
    { id: 'squat', pose: 'workout-squat', label: '스쿼트', x: 500, y: 245, width: 214, z: 26 }
  ],
  diet: [
    { id: 'island-left', pose: 'diet-left', label: '식사', x: 548, y: 548, width: 142, z: 58 },
    { id: 'island-center', pose: 'diet-center', label: '식사', x: 678, y: 610, width: 136, z: 64 },
    { id: 'island-right', pose: 'diet-right', label: '식사', x: 878, y: 558, width: 132, z: 60 }
  ],
  office: [
    { id: 'desk-upper', pose: 'office-upper', label: '업무', x: 1190, y: 382, width: 154, z: 46 },
    { id: 'desk-center', pose: 'office-center', label: '업무', x: 1394, y: 486, width: 148, z: 52 },
    { id: 'desk-lower', pose: 'office-lower', label: '업무', x: 1316, y: 610, width: 152, z: 66 }
  ]
};

const LARGE_MUSCLE_LABELS = {
  chest: '가슴',
  back: '등',
  lower: '하체',
  shoulder: '어깨',
  glute: '하체'
};
const LARGE_MUSCLE_ORDER = ['chest', 'back', 'lower', 'shoulder', 'glute'];
const SUBPATTERN_TO_MAJOR = {
  chest_all: 'chest',
  chest_upper: 'chest',
  chest_mid: 'chest',
  chest_lower: 'chest',
  back_all: 'back',
  back_width: 'back',
  back_thickness: 'back',
  posterior: 'back',
  shoulder_front: 'shoulder',
  shoulder_side: 'shoulder',
  rear_delt: 'shoulder',
  traps: 'shoulder',
  quad: 'lower',
  hamstring: 'lower',
  calf: 'lower',
  glute: 'glute',
  core: 'abs'
};
const MOVEMENT_TO_MAJOR = new Map((MOVEMENTS || []).map((movement) => [movement.id, movement.primary]));

const MEALS = [
  { label: '아침', text: 'breakfast', foods: 'bFoods', kcal: 'bKcal', photo: 'bPhoto', skipped: 'breakfast_skipped' },
  { label: '점심', text: 'lunch', foods: 'lFoods', kcal: 'lKcal', photo: 'lPhoto', skipped: 'lunch_skipped' },
  { label: '저녁', text: 'dinner', foods: 'dFoods', kcal: 'dKcal', photo: 'dPhoto', skipped: 'dinner_skipped' },
  { label: '간식', text: 'snack', foods: 'sFoods', kcal: 'sKcal', photo: 'sPhoto', skipped: null }
];
const MEAL_BY_TEXT = new Map(MEALS.map((meal) => [meal.text, meal]));

export function normalizeLifeZoneName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[\s_\-·.]/g, '')
    .trim();
}

export function getLifeZoneOwnerIdCandidates(accountId) {
  const raw = String(accountId || '').trim();
  const stripped = raw.replace(/\(guest\)$/, '').trim();
  const compact = stripped.replace(/\s+/g, '').trim();
  const ids = [raw];
  if (stripped) ids.push(stripped);
  if (compact) ids.push(compact);
  if (stripped) ids.push(`${stripped}(guest)`);
  if (compact) ids.push(`${compact}(guest)`);
  return [...new Set(ids.filter(Boolean))];
}

function accountCandidateNames(account = {}) {
  const first = String(account.firstName || '').replace(/\(.*?\)/g, '');
  const last = String(account.lastName || '');
  return [
    account.id,
    account.nickname,
    account.resolvedNickname,
    `${last}${first}`,
    `${first}${last}`,
    first
  ].filter(Boolean).map(normalizeLifeZoneName);
}

export function resolveLifeZoneRoster({
  actors = LIFE_ZONE_ACTORS,
  accounts = [],
  friends = [],
  currentUser = null
} = {}) {
  const friendIds = new Set((friends || []).map((friend) => friend.friendId).filter(Boolean));
  const currentId = currentUser?.id || null;
  const currentIds = new Set(getLifeZoneOwnerIdCandidates(currentId));

  return actors.map((actor) => {
    const matchKeys = [actor.displayName, ...(actor.matchNames || [])].map(normalizeLifeZoneName);
    const account = (accounts || []).find((candidate) => {
      const names = accountCandidateNames(candidate);
      return matchKeys.some((key) => names.includes(key));
    }) || null;
    const accountId = account?.id || null;
    const ownerIdCandidates = getLifeZoneOwnerIdCandidates(accountId);
    const matchedFriendId = ownerIdCandidates.find((ownerId) => friendIds.has(ownerId)) || null;
    const isSelf = ownerIdCandidates.some((ownerId) => currentIds.has(ownerId));
    const isFriend = !!matchedFriendId;

    return {
      ...actor,
      accountId,
      ownerIdCandidates,
      readAccountId: isSelf ? currentId : (matchedFriendId || accountId),
      source: isSelf ? 'self' : isFriend ? 'friend' : accountId ? 'unreadable' : 'unmatched',
      canRead: isSelf || isFriend
    };
  });
}

export function hasLifeZoneWorkoutActivity(dayData = null) {
  if (!dayData) return false;
  const exercises = dayData.exercises || [];
  const hasCompletedSet = exercises.some((exercise) =>
    (exercise.sets || []).some((set) => {
      if (!set || set.setType === 'warmup') return false;
      if (set.done === true) return true;
      if (set.done === false) return false;
      return (Number(set.kg) || 0) > 0 && (Number(set.reps) || 0) > 0;
    })
  );
  if (hasCompletedSet) return true;
  if (dayData.cf || dayData.swimming || dayData.running || dayData.stretching) return true;
  if ((dayData.muscles || []).length > 0) return true;
  if ((dayData.workoutDuration || 0) > 0) return true;
  if ((dayData.workoutTimeline?.durationSec || 0) > 0) return true;
  if ((dayData.workoutTimeline?.checkedSetCount || 0) > 0) return true;
  if ((dayData.runDistance || 0) > 0 || (dayData.runDurationMin || 0) > 0 || (dayData.runDurationSec || 0) > 0) return true;
  if ((dayData.swimDistance || 0) > 0 || (dayData.swimDurationMin || 0) > 0 || (dayData.swimDurationSec || 0) > 0) return true;
  if (String(dayData.swimStroke || '').trim()) return true;
  if ((dayData.cfDurationMin || 0) > 0 || (dayData.cfDurationSec || 0) > 0) return true;
  if (String(dayData.cfWod || '').trim()) return true;
  return (dayData.stretchDuration || 0) > 0;
}

export function hasLifeZoneRunningActivity(dayData = null) {
  if (!dayData) return false;
  const runData = dayData.runData || {};
  if (dayData.lifeZoneRunningLive || dayData.runLiveActive) return true;
  if (dayData.running === true || runData.running === true) return true;
  if ((Number(dayData.runDistance) || 0) > 0 || (Number(dayData.runDurationMin) || 0) > 0 || (Number(dayData.runDurationSec) || 0) > 0) return true;
  if ((Number(runData.distance) || 0) > 0 || (Number(runData.durationMin) || 0) > 0 || (Number(runData.durationSec) || 0) > 0) return true;
  if (Array.isArray(dayData.runRoute) && dayData.runRoute.length > 0) return true;
  if (Array.isArray(runData.route) && runData.route.length > 0) return true;
  if ((Number(dayData.runRouteSummary?.pointCount) || 0) > 0 || (Number(runData.routeSummary?.pointCount) || 0) > 0) return true;
  return !!(dayData.runStartedAt && !dayData.runEndedAt);
}

export function hasLifeZoneDietActivity(dayData = null) {
  if (!dayData) return false;
  if (dayData.breakfast || dayData.lunch || dayData.dinner || dayData.snack) return true;
  if ((dayData.bFoods || []).length || (dayData.lFoods || []).length || (dayData.dFoods || []).length || (dayData.sFoods || []).length) return true;
  if ((dayData.bKcal || 0) > 0 || (dayData.lKcal || 0) > 0 || (dayData.dKcal || 0) > 0 || (dayData.sKcal || 0) > 0) return true;
  if (dayData.breakfast_skipped || dayData.lunch_skipped || dayData.dinner_skipped) return true;
  return !!(dayData.bPhoto || dayData.lPhoto || dayData.dPhoto || dayData.sPhoto);
}

export function resolveLifeZoneActivity(dayData = null) {
  if (hasLifeZoneRunningActivity(dayData)) return 'running';
  const snapshotState = resolveLifeZoneActivitySnapshot(dayData);
  if (snapshotState) return snapshotState;
  if (hasLifeZoneWorkoutActivity(dayData)) return 'workout';
  if (hasLifeZoneDietActivity(dayData)) return 'diet';
  return 'office';
}

function lifeZoneSnapshotTime(snapshot = null) {
  const raw = snapshot?.updatedAt ?? snapshot?.at ?? snapshot?.createdAt ?? 0;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidLifeZoneSnapshotState(dayData, state) {
  if (state === 'running') return hasLifeZoneRunningActivity(dayData);
  if (state === 'workout') return hasLifeZoneWorkoutActivity(dayData);
  if (state === 'diet') return hasLifeZoneDietActivity(dayData);
  return false;
}

function normalizeLifeZoneSnapshot(snapshot = null) {
  const state = snapshot?.state === 'running' || snapshot?.type === 'running'
    ? 'running'
    : snapshot?.state === 'diet' || snapshot?.type === 'diet'
    ? 'diet'
    : snapshot?.state === 'workout' || snapshot?.type === 'workout'
      ? 'workout'
      : null;
  const updatedAt = lifeZoneSnapshotTime(snapshot);
  if (!state || updatedAt <= 0) return null;
  return {
    state,
    updatedAt,
    meal: typeof snapshot?.meal === 'string' ? snapshot.meal : null
  };
}

export function resolveLifeZoneActivitySnapshot(dayData = null) {
  if (!dayData) return null;
  const last = normalizeLifeZoneSnapshot(dayData.lifeZoneLastActivity || dayData.lifeZoneActivity || dayData.lastActivity);
  if (last && isValidLifeZoneSnapshotState(dayData, last.state)) return last.state;

  const candidates = [];
  if (hasLifeZoneWorkoutActivity(dayData)) {
    const snapshot = normalizeLifeZoneSnapshot(dayData.lifeZoneWorkoutActivity);
    if (snapshot) candidates.push(snapshot);
  }
  if (hasLifeZoneDietActivity(dayData)) {
    const snapshot = normalizeLifeZoneSnapshot(dayData.lifeZoneDietActivity);
    if (snapshot) candidates.push(snapshot);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.updatedAt - a.updatedAt);
  return candidates[0].state;
}

function hasActualLifeZoneSet(set) {
  if (!set || set.setType === 'warmup') return false;
  if (set.done === true) return true;
  if (set.done === false) return false;
  return (Number(set.kg) || 0) > 0 && (Number(set.reps) || 0) > 0;
}

function hasActualLifeZoneExercise(exercise = null) {
  if (!exercise) return false;
  return (exercise.sets || []).some(hasActualLifeZoneSet);
}

function normalizeLargeMuscleId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const major = SUBPATTERN_TO_MAJOR[raw] || raw;
  return LARGE_MUSCLE_LABELS[major] ? major : null;
}

function resolveExerciseMajor(exercise = {}) {
  const direct = normalizeLargeMuscleId(exercise.muscleId);
  if (direct) return direct;
  const muscleIds = Array.isArray(exercise.muscleIds) ? exercise.muscleIds : [];
  for (const muscleId of muscleIds) {
    const major = normalizeLargeMuscleId(muscleId);
    if (major) return major;
  }
  return normalizeLargeMuscleId(MOVEMENT_TO_MAJOR.get(exercise.movementId));
}

export function getLifeZoneWorkoutSpeech(dayData = null) {
  if (!hasLifeZoneWorkoutActivity(dayData)) return '';
  const found = new Set();
  for (const exercise of dayData?.exercises || []) {
    if (!hasActualLifeZoneExercise(exercise)) continue;
    const major = resolveExerciseMajor(exercise);
    if (major) found.add(major);
  }
  for (const muscle of dayData?.muscles || []) {
    const major = normalizeLargeMuscleId(muscle);
    if (major) found.add(major);
  }
  const labels = LARGE_MUSCLE_ORDER
    .filter((major) => found.has(major))
    .map((major) => LARGE_MUSCLE_LABELS[major])
    .filter((label, index, arr) => arr.indexOf(label) === index);
  return labels.length ? `오늘 ${labels.join('/')} 완료` : '오늘 운동 완료';
}

function mealHasRecord(dayData, meal) {
  return !!(
    String(dayData?.[meal.text] || '').trim()
    || (Array.isArray(dayData?.[meal.foods]) && dayData[meal.foods].length > 0)
    || (Number(dayData?.[meal.kcal]) || 0) > 0
    || dayData?.[meal.photo]
    || (meal.skipped && dayData?.[meal.skipped])
  );
}

function resolveDietSpeechMeal(dayData) {
  const snapshots = [
    normalizeLifeZoneSnapshot(dayData?.lifeZoneLastActivity || dayData?.lifeZoneActivity || dayData?.lastActivity),
    normalizeLifeZoneSnapshot(dayData?.lifeZoneDietActivity)
  ];
  for (const snapshot of snapshots) {
    if (snapshot?.state !== 'diet') continue;
    const meal = MEAL_BY_TEXT.get(snapshot.meal);
    if (meal && mealHasRecord(dayData, meal)) return meal;
  }
  return null;
}

export function getLifeZoneDietSpeech(dayData = null) {
  if (!hasLifeZoneDietActivity(dayData)) return '';
  const snapshotMeal = resolveDietSpeechMeal(dayData);
  if (snapshotMeal) {
    return snapshotMeal.skipped && dayData?.[snapshotMeal.skipped] ? `${snapshotMeal.label}기록` : `${snapshotMeal.label}냠냠`;
  }
  for (let i = MEALS.length - 1; i >= 0; i--) {
    const meal = MEALS[i];
    if (!mealHasRecord(dayData, meal)) continue;
    return meal.skipped && dayData?.[meal.skipped] ? `${meal.label}기록` : `${meal.label}냠냠`;
  }
  return '식단냠냠';
}

export function getLifeZoneRunningSpeech(dayData = null) {
  return hasLifeZoneRunningActivity(dayData) ? '러닝중' : '';
}

export function getLifeZoneSpeech(dayData = null, state = resolveLifeZoneActivity(dayData)) {
  if (state === 'running') return getLifeZoneRunningSpeech(dayData);
  if (state === 'workout') return getLifeZoneWorkoutSpeech(dayData);
  if (state === 'diet') return getLifeZoneDietSpeech(dayData);
  return '다른 일 하는중';
}

export function assignLifeZoneSlots(actorStates = [], slots = LIFE_ZONE_SLOTS) {
  const counters = { running: 0, workout: 0, diet: 0, office: 0 };
  return actorStates.map((actor) => {
    const state = slots[actor.state] ? actor.state : 'office';
    const zoneSlots = slots[state] || slots.office;
    const slot = zoneSlots[counters[state] % zoneSlots.length];
    counters[state] += 1;

    return {
      ...actor,
      state,
      slot,
      sprite: `${actor.spritePrefix}-${slot.pose}.png`
    };
  });
}

export function resolveLifeZoneActors({
  roster = LIFE_ZONE_ACTORS,
  accounts = [],
  friends = [],
  currentUser = null,
  dayByAccountId = {}
} = {}) {
  const resolvedRoster = resolveLifeZoneRoster({ actors: roster, accounts, friends, currentUser });
  const actorStates = resolvedRoster.map((actor) => {
    const dayData = actor.canRead && actor.accountId ? dayByAccountId[actor.accountId] : null;
    const state = resolveLifeZoneActivity(dayData);
    return {
      ...actor,
      state,
      speech: getLifeZoneSpeech(dayData, state)
    };
  });
  return assignLifeZoneSlots(actorStates);
}
