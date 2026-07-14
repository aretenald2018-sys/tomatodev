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

const CURRENT_USER_ACTOR_SPRITE_PREFIX = 'jups';
const CURRENT_USER_ACTOR_COLOR = '#fa342c';

export const LIFE_ZONE_SLOTS = {
  running: [
    {
      id: 'track-bottom-left',
      pose: 'running-track',
      label: '러닝',
      x: 156,
      y: 1098,
      width: 118,
      z: 96,
      labelY: 1076,
      bubbleX: 206,
      bubbleY: 1076,
      mapTipX: 50,
      runDelay: '0s',
      runDuration: '0.58s'
    },
    {
      id: 'track-bottom-center',
      pose: 'running-track',
      label: '러닝',
      x: 352,
      y: 1138,
      width: 126,
      z: 100,
      labelY: 1114,
      bubbleX: 414,
      bubbleY: 1116,
      mapTipX: 50,
      runDelay: '-0.18s',
      runDuration: '0.6s'
    },
    {
      id: 'track-bottom-right',
      pose: 'running-track',
      label: '러닝',
      x: 650,
      y: 1100,
      width: 108,
      z: 98,
      labelY: 1078,
      bubbleX: 690,
      bubbleY: 1078,
      mapTipX: 50,
      runDelay: '-0.34s',
      runDuration: '0.56s'
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
    { id: 'desk-lower', pose: 'office-lower', label: '업무', x: 1316, y: 610, width: 152, z: 66 },
    { id: 'lounge-lower-right', pose: 'office-lower', label: '업무', x: 1450, y: 708, width: 142, z: 82 }
  ]
};

const LARGE_MUSCLE_LABELS = {
  chest: '가슴',
  back: '등',
  lower: '하체',
  shoulder: '어깨',
  glute: '하체'
};
const WORKOUT_SLOT_BY_MAJOR = {
  chest: 'bench',
  back: 'lat',
  lower: 'squat',
  shoulder: 'lat',
  glute: 'squat'
};
const DEFAULT_WORKOUT_SLOT_ID = 'bench';
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
const DAY_MS = 24 * 60 * 60 * 1000;
const CONSULTING_VISITOR_NEW_DAYS = 7;
const CONSULTING_VISITOR_RETURNING_DAYS = 10;

export function normalizeLifeZoneName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[\s_\-·.]/g, '')
    .trim();
}

export function formatLifeZoneDateLabel(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function cleanLifeZoneDisplayName(value) {
  return String(value || '').replace(/\(.*?\)/g, '').trim();
}

export function getLifeZoneAccountDisplayName(account = {}) {
  const first = cleanLifeZoneDisplayName(account.firstName);
  const last = cleanLifeZoneDisplayName(account.lastName);
  const fullName = `${last}${first}`.trim();
  const candidates = [
    account.resolvedNickname,
    account.nickname,
    fullName,
    account.displayName,
    account.name,
    account.id
  ];

  for (const candidate of candidates) {
    const displayName = cleanLifeZoneDisplayName(candidate);
    if (displayName) return displayName;
  }
  return '나';
}

function normalizeLifeZoneTimestamp(value) {
  if (value == null || value === '') return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 0 ? numeric : 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveLifeZoneConsultingVisitor({
  currentUser = null,
  previousLastLoginAt = 0,
  createdAt = null,
  showCurrentUser = false,
  now = Date.now()
} = {}) {
  const userId = String(currentUser?.id || '').trim();
  if (!userId || userId.includes('(guest)')) return null;

  const nowTs = normalizeLifeZoneTimestamp(now) || Date.now();
  const previousLoginTs = normalizeLifeZoneTimestamp(previousLastLoginAt);
  const createdTs = normalizeLifeZoneTimestamp(createdAt ?? currentUser?.createdAt);
  const daysAway = previousLoginTs > 0 ? Math.max(0, (nowTs - previousLoginTs) / DAY_MS) : null;
  const accountAgeDays = createdTs > 0 ? Math.max(0, (nowTs - createdTs) / DAY_MS) : null;

  if (daysAway != null && daysAway >= CONSULTING_VISITOR_RETURNING_DAYS) {
    return {
      state: 'returning',
      userId,
      displayName: getLifeZoneAccountDisplayName(currentUser),
      daysAway: Math.floor(daysAway)
    };
  }

  if (previousLoginTs <= 0 || (accountAgeDays != null && accountAgeDays <= CONSULTING_VISITOR_NEW_DAYS)) {
    return {
      state: 'new',
      userId,
      displayName: getLifeZoneAccountDisplayName(currentUser),
      accountAgeDays: accountAgeDays == null ? null : Math.floor(accountAgeDays)
    };
  }

  if (showCurrentUser) {
    return {
      state: 'current',
      userId,
      displayName: getLifeZoneAccountDisplayName(currentUser)
    };
  }

  return null;
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
    account.displayName,
    account.name,
    `${last}${first}`,
    `${first}${last}`,
    first
  ].filter(Boolean).map(normalizeLifeZoneName);
}

function mergeCurrentLifeZoneAccount(accounts = [], currentUser = null) {
  if (!currentUser?.id) return accounts || [];
  const currentIds = new Set(getLifeZoneOwnerIdCandidates(currentUser.id));
  const hasCurrent = (accounts || []).some((account) =>
    getLifeZoneOwnerIdCandidates(account.id).some((ownerId) => currentIds.has(ownerId))
  );
  return hasCurrent ? accounts : [...(accounts || []), currentUser];
}

function findCurrentLifeZoneAccount(accounts = [], currentUser = null) {
  if (!currentUser?.id) return currentUser || null;
  const currentIds = new Set(getLifeZoneOwnerIdCandidates(currentUser.id));
  return (accounts || []).find((account) =>
    getLifeZoneOwnerIdCandidates(account.id).some((ownerId) => currentIds.has(ownerId))
  ) || currentUser;
}

function actorMatchesAccount(actor = {}, account = {}) {
  const actorKeys = [actor.displayName, ...(actor.matchNames || [])]
    .map(normalizeLifeZoneName)
    .filter(Boolean);
  const accountKeys = accountCandidateNames(account);
  return actorKeys.some((key) => accountKeys.includes(key));
}

export function includeCurrentLifeZoneActor({
  actors = LIFE_ZONE_ACTORS,
  accounts = [],
  currentUser = null
} = {}) {
  const actorList = [...(actors || [])];
  if (!currentUser?.id) return actorList;

  const currentAccount = findCurrentLifeZoneAccount(accounts, currentUser);
  if (actorList.some((actor) => actorMatchesAccount(actor, currentAccount))) {
    return actorList;
  }

  const displayName = getLifeZoneAccountDisplayName(currentAccount);
  const selfKey = normalizeLifeZoneName(currentUser.id || displayName) || 'me';
  const matchNames = [
    displayName,
    currentUser.id,
    currentAccount?.id,
    currentAccount?.nickname,
    currentAccount?.resolvedNickname
  ].filter(Boolean);

  return [
    ...actorList,
    {
      id: `current-user-${selfKey}`,
      displayName,
      spritePrefix: CURRENT_USER_ACTOR_SPRITE_PREFIX,
      color: CURRENT_USER_ACTOR_COLOR,
      matchNames
    }
  ];
}

export function getLifeZoneTitleNames(actors = []) {
  const seen = new Set();
  const names = [];
  for (const actor of actors || []) {
    const displayName = getLifeZoneAccountDisplayName(actor);
    const key = normalizeLifeZoneName(displayName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(displayName);
  }
  return names;
}

export function resolveLifeZoneRoster({
  actors = LIFE_ZONE_ACTORS,
  accounts = [],
  friends = [],
  currentUser = null
} = {}) {
  const accountPool = mergeCurrentLifeZoneAccount(accounts, currentUser);
  const actorList = includeCurrentLifeZoneActor({ actors, accounts: accountPool, currentUser });
  const friendIds = new Set((friends || []).map((friend) => friend.friendId).filter(Boolean));
  const currentId = currentUser?.id || null;
  const currentIds = new Set(getLifeZoneOwnerIdCandidates(currentId));

  return actorList.map((actor) => {
    const matchKeys = [actor.displayName, ...(actor.matchNames || [])].map(normalizeLifeZoneName);
    const account = (accountPool || []).find((candidate) => {
      const names = accountCandidateNames(candidate);
      return matchKeys.some((key) => names.includes(key));
    }) || null;
    const accountId = account?.id || null;
    const ownerIdCandidates = getLifeZoneOwnerIdCandidates(accountId);
    const matchedFriendId = ownerIdCandidates.find((ownerId) => friendIds.has(ownerId)) || null;
    const isSelf = ownerIdCandidates.some((ownerId) => currentIds.has(ownerId));
    const isFriend = !!matchedFriendId;
    const isGlobal = !!accountId;

    return {
      ...actor,
      accountId,
      ownerIdCandidates,
      readAccountId: isSelf ? currentId : (matchedFriendId || accountId),
      source: isSelf ? 'self' : isFriend ? 'friend' : isGlobal ? 'global' : 'unmatched',
      canRead: isSelf || isFriend || isGlobal
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

function hasLifeZoneWeightWorkoutActivity(dayData = null) {
  if (!dayData) return false;
  if ((dayData.exercises || []).some(hasActualLifeZoneExercise)) return true;
  if ((dayData.muscles || []).length > 0) return true;
  return (dayData.workoutTimeline?.checkedSetCount || 0) > 0;
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
  if ((Array.isArray(dayData.workoutSessions) ? dayData.workoutSessions : []).some(_hasLifeZoneRunningSession)) return true;
  return !!(dayData.runStartedAt && !dayData.runEndedAt);
}

export function hasLifeZoneActiveRunning(dayData = null) {
  if (!dayData) return false;
  const runData = dayData.runData || {};
  if (dayData.lifeZoneRunningLive || dayData.runLiveActive) return true;
  if (runData.lifeZoneRunningLive || runData.runLiveActive) return true;
  const startedAt = dayData.runStartedAt || runData.startedAt;
  const endedAt = dayData.runEndedAt || runData.endedAt;
  return !!(startedAt && !endedAt);
}

function _runningMapNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function _normalizeLifeZoneRunningPoint(point = null) {
  const lat = _runningMapNumber(point?.lat ?? point?.latitude);
  const lng = _runningMapNumber(point?.lng ?? point?.lon ?? point?.longitude);
  if (lat == null || lng == null) return null;
  const normalized = { lat, lng };
  const ts = _runningMapNumber(point?.ts ?? point?.timestamp ?? point?.time);
  if (ts != null) normalized.ts = ts;
  const accuracy = _runningMapNumber(point?.accuracy);
  if (accuracy != null) normalized.accuracy = accuracy;
  const altitude = _runningMapNumber(point?.altitude);
  if (altitude != null) normalized.altitude = altitude;
  const speed = _runningMapNumber(point?.speed);
  if (speed != null) normalized.speed = speed;
  return normalized;
}

function _normalizeLifeZoneRunningRoute(points = []) {
  return (Array.isArray(points) ? points : [])
    .map(_normalizeLifeZoneRunningPoint)
    .filter(Boolean);
}

function _hasLifeZoneRunningSession(session = null) {
  if (!session || typeof session !== 'object') return false;
  return session.running === true
    || (Number(session.runDistance) || 0) > 0
    || (Number(session.runDurationMin) || 0) > 0
    || (Number(session.runDurationSec) || 0) > 0
    || (Array.isArray(session.runRoute) && session.runRoute.length > 0)
    || !!session.runRouteRef
    || (Number(session.runRouteSummary?.pointCount) || 0) > 0;
}

function _latestLifeZoneRunningSession(dayData = {}) {
  const sessions = (Array.isArray(dayData.workoutSessions) ? dayData.workoutSessions : [])
    .filter(_hasLifeZoneRunningSession);
  return sessions.reduce((latest, session) => {
    if (!latest) return session;
    const timestamp = Number(session.runEndedAt || session.updatedAt || session.runStartedAt) || 0;
    const latestTimestamp = Number(latest.runEndedAt || latest.updatedAt || latest.runStartedAt) || 0;
    return timestamp >= latestTimestamp ? session : latest;
  }, null);
}

function _firstLifeZoneRunningRoute(dayData = {}, runData = {}, sessionData = {}) {
  if (dayData.lifeZoneRunningLive || dayData.runLiveActive) {
    return _normalizeLifeZoneRunningRoute(dayData.lifeZoneRunningRoute);
  }
  const candidates = [
    dayData.lifeZoneRunningRoute,
    dayData.runRoute,
    runData.route,
    sessionData.runRoute
  ];
  for (const candidate of candidates) {
    const route = _normalizeLifeZoneRunningRoute(candidate);
    if (route.length) return route;
  }
  return [];
}

function _formatLifeZoneRunningPlace(placeSummary = null) {
  const label = String(placeSummary?.label || '').trim();
  const area = placeSummary?.adminArea || {};
  const dong = String(area.dong || area.adminDong || area.legalDong || '').trim();
  const district = String(area.district || '').trim();
  if (dong && district) return `${dong} · ${district}`;
  if (dong) return dong;
  if (label && !/위치 확인 중|위치 정보 없음|위치 기록/.test(label)) {
    const parts = label.split(/[,\s]+/).map(part => part.trim()).filter(Boolean);
    const labelDong = [...parts].reverse().find(part => /(동|읍|면|리)$/.test(part));
    const labelDistrict = [...parts].reverse().find(part => part !== labelDong && /(구|군|시)$/.test(part));
    if (labelDong && labelDistrict) return `${labelDong} · ${labelDistrict}`;
    if (labelDong) return labelDong;
    return label.split(',').map(part => part.trim()).filter(Boolean).slice(0, 2).join(' · ') || label;
  }
  return '';
}

export function getLifeZoneRunningMapData(dayData = null) {
  if (!hasLifeZoneRunningActivity(dayData)) return null;
  const runData = dayData?.runData || {};
  const sessionData = _latestLifeZoneRunningSession(dayData || {}) || {};
  const route = _firstLifeZoneRunningRoute(dayData || {}, runData, sessionData);
  const aggregateSummary = dayData?.lifeZoneRunningRouteSummary
    || dayData?.runRouteSummary
    || runData.routeSummary
    || null;
  const sessionSummary = sessionData.runRouteSummary || null;
  const routeSummary = aggregateSummary || sessionSummary
    ? {
        ...(sessionSummary || {}),
        ...(aggregateSummary || {}),
        centroid: aggregateSummary?.centroid || sessionSummary?.centroid || null,
      }
    : null;
  const placeSummary = dayData?.lifeZoneRunningPlaceSummary
    || dayData?.runPlaceSummary
    || runData.placeSummary
    || sessionData.runPlaceSummary
    || null;
  const placeLabel = _formatLifeZoneRunningPlace(placeSummary);
  const mapImageDataUrl = String(routeSummary?.mapImageDataUrl || '');
  const previewPoint = _normalizeLifeZoneRunningPoint(
    dayData?.lifeZoneRunningPreviewPoint
    || dayData?.runPreviewPoint
    || runData.previewPoint
    || route[route.length - 1]
    || sessionData.runRoute?.[sessionData.runRoute.length - 1]
    || routeSummary?.centroid
  );
  return {
    live: !!(dayData?.lifeZoneRunningLive || dayData?.runLiveActive),
    route,
    routeSummary,
    mapImageDataUrl: /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(mapImageDataUrl)
      ? mapImageDataUrl
      : '',
    placeSummary,
    placeLabel,
    previewPoint,
    pointCount: Math.max(route.length, Number(routeSummary?.pointCount) || 0),
    updatedAt: dayData?.lifeZoneRunningUpdatedAt || dayData?.runUpdatedAt || routeSummary?.endedAt || null
  };
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
  if (hasLifeZoneActiveRunning(dayData)) return 'running';
  const snapshotState = resolveLifeZoneActivitySnapshot(dayData);
  const hasWorkout = hasLifeZoneWorkoutActivity(dayData);
  const hasWeightWorkout = hasLifeZoneWeightWorkoutActivity(dayData);
  if (snapshotState && (snapshotState !== 'running' || !hasWeightWorkout)) return snapshotState;
  if (hasWeightWorkout) return 'workout';
  if (hasLifeZoneRunningActivity(dayData)) return 'running';
  if (hasWorkout) return 'workout';
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

function resolveLifeZoneWorkoutSlotId(dayData = null) {
  if (!hasLifeZoneWorkoutActivity(dayData)) return null;
  for (const exercise of dayData?.exercises || []) {
    if (!hasActualLifeZoneExercise(exercise)) continue;
    const major = resolveExerciseMajor(exercise);
    if (major) return WORKOUT_SLOT_BY_MAJOR[major] || DEFAULT_WORKOUT_SLOT_ID;
  }
  for (const muscle of dayData?.muscles || []) {
    const major = normalizeLargeMuscleId(muscle);
    if (major) return WORKOUT_SLOT_BY_MAJOR[major] || DEFAULT_WORKOUT_SLOT_ID;
  }
  return DEFAULT_WORKOUT_SLOT_ID;
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

function resolveDietMeal(dayData) {
  const snapshotMeal = resolveDietSpeechMeal(dayData);
  if (snapshotMeal) return snapshotMeal;
  for (let i = MEALS.length - 1; i >= 0; i--) {
    const meal = MEALS[i];
    if (mealHasRecord(dayData, meal)) return meal;
  }
  return null;
}

export function getLifeZoneDietSpeech(dayData = null) {
  if (!hasLifeZoneDietActivity(dayData)) return '';
  const meal = resolveDietMeal(dayData);
  if (meal) return meal.skipped && dayData?.[meal.skipped] ? `${meal.label}기록` : `${meal.label}냠냠`;
  return '식단냠냠';
}

function getLifeZoneDietSpeechPhoto(dayData = null) {
  if (!hasLifeZoneDietActivity(dayData)) return null;
  const meal = resolveDietMeal(dayData);
  if (!meal) return null;
  const photo = typeof dayData?.[meal.photo] === 'string' ? dayData[meal.photo].trim() : '';
  return photo || null;
}

function getLifeZoneDietSpeechPhotoMeta(dayData = null) {
  if (!hasLifeZoneDietActivity(dayData)) return null;
  const meal = resolveDietMeal(dayData);
  if (!meal) return null;
  const photo = typeof dayData?.[meal.photo] === 'string' ? dayData[meal.photo].trim() : '';
  if (!photo) return null;
  return {
    photo,
    meal: meal.text,
    likeField: `meal_${meal.text}`
  };
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
  const usedWorkoutSlots = new Set();
  return actorStates.map((actor) => {
    const state = slots[actor.state] ? actor.state : 'office';
    const zoneSlots = slots[state] || slots.office;
    let slot = zoneSlots[counters[state] % zoneSlots.length];
    if (state === 'workout') {
      const preferredSlotId = actor.workoutSlotId || DEFAULT_WORKOUT_SLOT_ID;
      const preferredSlot = zoneSlots.find((candidate) => candidate.id === preferredSlotId);
      const orderedSlots = [
        preferredSlot,
        ...zoneSlots.filter((candidate) => candidate.id !== preferredSlotId)
      ].filter(Boolean);
      slot = orderedSlots.find((candidate) => !usedWorkoutSlots.has(candidate.id))
        || orderedSlots[counters[state] % orderedSlots.length]
        || slot;
      usedWorkoutSlots.add(slot.id);
    }
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
    const photoMeta = state === 'diet' ? getLifeZoneDietSpeechPhotoMeta(dayData) : null;
    return {
      ...actor,
      state,
      speech: getLifeZoneSpeech(dayData, state),
      speechPhoto: photoMeta?.photo || null,
      speechPhotoMeal: photoMeta?.meal || null,
      speechLikeField: photoMeta?.likeField || null,
      workoutSlotId: state === 'workout' ? resolveLifeZoneWorkoutSlotId(dayData) : null,
      runningMap: state === 'running' ? getLifeZoneRunningMapData(dayData) : null
    };
  });
  return assignLifeZoneSlots(actorStates);
}
