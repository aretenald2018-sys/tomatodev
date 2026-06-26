// ================================================================
// data/data-pure.js — Firebase 비의존 순수 함수/상수
// ================================================================
// 의도: data-core.js 는 Firebase HTTPS URL import 때문에 node:test 환경에서
//       로드할 수 없다. 사이드이펙트 없는 탭 정리/활성일 판정 로직을 여기로
//       빼면 단위 테스트 가능 (tests/data.load-save.test.js).
// data-core.js 와 data-load.js 가 이 모듈에서 import 한다.
// ================================================================

// ── Default tab order (live 탭만) ───────────────────────────────
export const DEFAULT_TAB_ORDER     = ['home','diet','workout','calendar','cooking','stats'];
export const DEFAULT_VISIBLE_TABS  = ['home','diet','workout','calendar'];
export const EXERCISE_CATALOG_SEED_VERSION = 1;
export const EXERCISE_CATALOG_SEED_KEY = 'exercise_catalog_seed';

// ── Equipment ↔ movement inference ──────────────────────────────
const EQUIPMENT_CATEGORY_ALIASES = {
  '바벨': 'barbell',
  '덤벨': 'dumbbell',
  '맨몸': 'bodyweight',
  '케이블': 'cable',
  '스미스': 'smith',
  '스미스머신': 'smith',
  '머신': 'machine',
  '핀머신': 'machine',
  '플레이트머신': 'machine',
  'pinmachine': 'machine',
  'plateloaded': 'machine',
  'selectorized': 'machine',
};
const EQUIPMENT_CATEGORY_SET = new Set(['barbell', 'dumbbell', 'bodyweight', 'cable', 'smith', 'machine']);

export function normalizeEquipmentMatchKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s·_\-()[\]{}.,/\\|:+]+/g, '')
    .replace(/운동기구|machine|머신|기구/g, '');
}

function _equipmentCategoryKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s·_\-()[\]{}.,/\\|:+]+/g, '');
}

export function normalizeEquipmentCategory(value = '') {
  const raw = _equipmentCategoryKey(value);
  if (!raw) return '';
  return EQUIPMENT_CATEGORY_ALIASES[raw] || raw;
}

function _movementMatchKeys(movement = {}) {
  return [
    movement.nameKo,
    movement.name,
    movement.id,
  ].map(normalizeEquipmentMatchKey).filter(Boolean);
}

function _movementNameMatchScore(itemKey = '', movement = {}) {
  if (!itemKey || !movement?.id) return 0;
  let best = 0;
  for (const key of _movementMatchKeys(movement)) {
    if (!key) continue;
    if (key === itemKey) best = Math.max(best, 1000 + key.length);
    else if (itemKey.includes(key)) best = Math.max(best, 500 + key.length);
    else if (key.includes(itemKey)) best = Math.max(best, 300 + itemKey.length);
  }
  return best;
}

export function inferEquipmentMovementIds(item = {}, movements = []) {
  const explicit = Array.isArray(item.movementIds)
    ? [...new Set(item.movementIds.filter(Boolean))]
    : [];
  if (explicit.length) return explicit;

  const itemKey = normalizeEquipmentMatchKey(item.name);
  if (!itemKey) return [];

  const category = normalizeEquipmentCategory(item.category);
  const matches = [];
  for (const movement of movements || []) {
    if (!movement?.id) continue;
    if (EQUIPMENT_CATEGORY_SET.has(category) && movement.equipment_category && movement.equipment_category !== category) continue;
    const score = _movementNameMatchScore(itemKey, movement);
    if (score > 0) matches.push({ id: movement.id, score });
  }
  return [...new Map(
    matches
      .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
      .map(match => [match.id, match.id])
  ).values()];
}

export function inferExerciseMovementId(item = {}, movements = []) {
  const explicit = item?.movementId && item.movementId !== 'unknown'
    ? String(item.movementId)
    : '';
  if (explicit && (!(movements || []).length || (movements || []).some(m => m?.id === explicit))) {
    return explicit;
  }
  return inferEquipmentMovementIds({
    name: item?.name || item?.nameKo || '',
    category: item?.category || item?.equipment_category || '',
    movementIds: [],
  }, movements)[0] || explicit || null;
}

export function normalizeExerciseMovementRecord(item = {}, movements = []) {
  const movementId = inferExerciseMovementId(item, movements);
  return movementId ? { ...item, movementId } : { ...item };
}

// ── Legacy tab sanitizer ────────────────────────────────────────
// 과거 경량화 이전에 저장된 tab_order/visible_tabs 에는 이미 UI 가 제거된
// 레거시 탭('monthly' 캘린더, 'finance', 'wine', 'movie', 'dev' 등)이
// 남아 있을 수 있음. 이 탭들이 남아 있으면 applyTabOrder/initSwipeNavigation 이
// 존재하지 않는 #tab-* 패널을 찾으려 하여 잠깐의 플래시/빈 렌더가 발생함.
// 알려진 live 탭만 필터링해 그 플래시를 차단한다.
const _LIVE_TABS = new Set(['home','diet','workout','cooking','stats','calendar','admin']);
// 하단 탭바 노출 순서는 항상 [home, diet, workout, calendar] 로 강제 (요구사항)
const _REQUIRED_PREFIX = ['home','diet','workout','calendar'];

export function _sanitizeTabList(list) {
  if (!Array.isArray(list)) return [...DEFAULT_TAB_ORDER];
  const cleaned = list.filter(t => _LIVE_TABS.has(t));
  if (!cleaned.length) return [...DEFAULT_TAB_ORDER];
  // 앞 4개가 required 순서가 아니면 DEFAULT 로 강제 복원
  const head = cleaned.slice(0, _REQUIRED_PREFIX.length).join(',');
  if (head !== _REQUIRED_PREFIX.join(',')) return [...DEFAULT_TAB_ORDER];
  return cleaned;
}

function _validExerciseList(list) {
  return Array.isArray(list) ? list.filter(ex => ex && ex.id) : [];
}

function _isExerciseCatalogSeedComplete(seedState) {
  return seedState?.status === 'completed'
    && Number(seedState.version) >= EXERCISE_CATALOG_SEED_VERSION;
}

export function buildExerciseCatalogSeedPlan({
  defaultExercises = [],
  storedExercises = [],
  seedState = null,
  now = null,
} = {}) {
  const stored = _validExerciseList(storedExercises).map(ex => ({ ...ex }));
  if (_isExerciseCatalogSeedComplete(seedState)) {
    return {
      exercises: stored,
      seedExercises: [],
      seedMarker: seedState,
      needsSeed: false,
    };
  }

  const storedIds = new Set(stored.map(ex => ex.id));
  const seedExercises = _validExerciseList(defaultExercises)
    .filter(ex => !storedIds.has(ex.id))
    .map(ex => ({
      ...ex,
      catalogSource: ex.catalogSource || 'default',
      defaultSeedVersion: EXERCISE_CATALOG_SEED_VERSION,
      seededAt: now,
    }));

  return {
    exercises: [...seedExercises, ...stored],
    seedExercises,
    seedMarker: {
      version: EXERCISE_CATALOG_SEED_VERSION,
      status: 'completed',
      completedAt: now,
      seededCount: seedExercises.length,
      existingCount: stored.length,
    },
    needsSeed: true,
  };
}

function _storedMaxCycleTime(cycle = null) {
  return Math.max(0, Number(cycle?.updatedAt) || 0, Number(cycle?.createdAt) || 0);
}

function _storedMaxCycleScore(cycle = null) {
  if (!cycle || !Array.isArray(cycle.benchmarks)) return 0;
  return cycle.benchmarks.reduce((score, benchmark) => score + (benchmark?.exerciseId ? 2 : 1), 0);
}

export function selectMaxCycleForExerciseCleanup(presetCycle = null, settingCycle = null) {
  const presetValid = presetCycle && Array.isArray(presetCycle.benchmarks) ? presetCycle : null;
  const settingValid = settingCycle && Array.isArray(settingCycle.benchmarks) ? settingCycle : null;
  if (!presetValid) return settingValid;
  if (!settingValid) return presetValid;
  const presetTime = _storedMaxCycleTime(presetValid);
  const settingTime = _storedMaxCycleTime(settingValid);
  if (settingTime > presetTime) return settingValid;
  if (presetTime > settingTime) return presetValid;
  return _storedMaxCycleScore(settingValid) >= _storedMaxCycleScore(presetValid)
    ? settingValid
    : presetValid;
}

export function removeExerciseFromMaxCycle(cycle = null, exerciseId = '', now = null) {
  if (!cycle || !Array.isArray(cycle.benchmarks) || !exerciseId) {
    return { cycle, removed: 0, changed: false };
  }
  const benchmarks = cycle.benchmarks.filter(benchmark => benchmark?.exerciseId !== exerciseId);
  const removed = cycle.benchmarks.length - benchmarks.length;
  if (!removed) return { cycle, removed: 0, changed: false };
  return {
    cycle: { ...cycle, benchmarks, updatedAt: now ?? cycle.updatedAt ?? null },
    removed,
    changed: true,
  };
}

function _isMaxCycleRecord(cycle = null) {
  return cycle && typeof cycle === 'object' && Array.isArray(cycle.benchmarks);
}

export function buildMaxCycleCanonicalPlan({
  expertPreset = null,
  settingCycle = null,
  now = null,
} = {}) {
  const preset = expertPreset && typeof expertPreset === 'object' ? { ...expertPreset } : {};
  const hasLegacyMaxCycle = Object.prototype.hasOwnProperty.call(preset, 'maxCycle');
  const legacyCycle = _isMaxCycleRecord(preset.maxCycle) ? preset.maxCycle : null;
  const canonicalCycle = settingCycle || (legacyCycle
    ? { ...legacyCycle, updatedAt: Number(legacyCycle.updatedAt) || now }
    : null);
  let cleanedPreset = null;
  if (hasLegacyMaxCycle) {
    cleanedPreset = { ...preset, updatedAt: now, maxCycleMigratedAt: now };
    delete cleanedPreset.maxCycle;
  }
  return {
    canonicalCycle,
    cleanedPreset,
    shouldWriteMaxCycle: !settingCycle && !!legacyCycle,
    shouldWriteExpertPreset: !!cleanedPreset,
  };
}

// ── isActiveWorkoutDayData — day 객체가 "기록 있음" 상태인지 pure 판정 ──
function _hasActualWorkoutSet(set) {
  if (!set || set.setType === 'warmup') return false;
  if (set.done === true) return true;
  if (set.done === false) return false;
  return (Number(set.kg) || 0) > 0 && (Number(set.reps) || 0) > 0;
}

function _hasActualWorkoutExercise(ex) {
  return !!(ex && (
    (ex.note || '').toString().trim() ||
    (ex.sets || []).some(_hasActualWorkoutSet)
  ));
}

export function isActiveWorkoutDayData(workoutData) {
  if (!workoutData) return false;
  const w = workoutData;
  if ((w.workoutSessions || []).some(session => isActiveWorkoutDayData(session))) return true;
  if ((w.exercises || []).some(_hasActualWorkoutExercise)) return true;
  if (w.cf || w.swimming || w.running || w.stretching) return true;
  if ((w.muscles || []).length > 0) return true;
  if ((w.workoutDuration || 0) > 0) return true;
  if ((w.workoutTimeline?.durationSec || 0) > 0) return true;
  if ((w.workoutTimeline?.checkedSetCount || 0) > 0) return true;
  if ((w.runDistance || 0) > 0) return true;
  if ((w.runDurationMin || 0) > 0) return true;
  if ((w.runDurationSec || 0) > 0) return true;
  if ((w.cfDurationMin || 0) > 0) return true;
  if ((w.cfDurationSec || 0) > 0) return true;
  if ((w.cfWod || '').toString().trim()) return true;
  if ((w.stretchDuration || 0) > 0) return true;
  if ((w.swimDistance || 0) > 0) return true;
  if ((w.swimDurationMin || 0) > 0) return true;
  if ((w.swimDurationSec || 0) > 0) return true;
  if ((w.swimStroke || '').toString().trim()) return true;
  if (w.bKcal || w.lKcal || w.dKcal) return true;
  if (w.sKcal) return true;
  if ((w.bFoods || []).length || (w.lFoods || []).length || (w.dFoods || []).length) return true;
  if ((w.sFoods || []).length) return true;
  if (w.breakfast || w.lunch || w.dinner) return true;
  if (w.snack) return true;
  if (w.bPhoto || w.lPhoto || w.dPhoto || w.sPhoto || w.workoutPhoto) return true;
  if (w.workoutPhoto) return true;
  return false;
}
