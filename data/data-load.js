// ================================================================
// data/data-load.js — 앱 시작 시 전체 데이터 로드 + 관련 마이그레이션/헬퍼
// ================================================================
// loadAll: 로그인 후 _cache + _settings + _exList + _goals/_quests 등 초기 덤프.
// migrateDataToUser/unifySharedAccountData: 호환 export만 유지하는 write-free API.
// _sanitizeTabList: 레거시 탭 필터 (finance/wine/movie/monthly 등 제거).
// isActiveWorkoutDayData: day 객체가 "기록 있음" 상태인지 판정.
// ================================================================

import { CONFIG, MOVEMENTS } from '../config.js';
import {
  db, collection, getDocs, onSnapshot,
  getCurrentUserRef, ADMIN_ID, getDataOwnerId,
  hasResolvedSharedAccountOwner, resolveDataOwnerIdForAccount, setResolvedSharedAccountOwnerId,
  _cache, _nutritionDB,
  _setCache, _setExList, _setCustomMuscles, _setGoals, _setQuests, _setCooking, _setBodyCheckins, _setNutritionDB,
  DEFAULT_TAB_ORDER, DEFAULT_DIET_PLAN, DEFAULT_EXPERT_PRESET,
  _setDietPlan, _settings,
  _setTomatoCycles,
  _setSyncStatus,
} from './data-core.js';
import { isAdmin, isAdminGuest } from './data-auth.js';
import { _sortExList } from './data-helpers.js';
import { loadGyms, loadRoutineTemplates } from './data-workout-equipment.js';
import { loadEquipmentPool } from './data-equipment-pool.js';
import {
  getAccountOwnerAliases,
  isSharedAdminAccount,
} from './account-unification.js';

// ── Pure 헬퍼 (Firebase 비의존) ─────────────────────────────────
// node:test 에서 import 가능하도록 data/data-pure.js 로 분리. 여기서는 re-export.
import {
  EXERCISE_CATALOG_SEED_KEY,
  buildExerciseCatalogSeedPlan,
  buildMaxCycleCanonicalPlan,
  normalizeExerciseMovementRecord,
  _sanitizeTabList,
  isActiveWorkoutDayData,
} from './data-pure.js';
import {
  restorePendingDayWritesForOwner,
  flushPendingDayWrites,
  initializePendingDayWriteSync,
} from './data-save.js';
import { reassignPendingDayWrites } from './pending-day-writes.js';
export { _sanitizeTabList, isActiveWorkoutDayData, buildExerciseCatalogSeedPlan };

let _workoutRealtimeUnsubscribe = null;
let _workoutRealtimeOwnerId = null;
let _workoutRealtimeGeneration = 0;
let _loadAllGeneration = 0;

function _changedWorkoutDateKeys(previousCache, nextCache) {
  const keys = new Set([
    ...Object.keys(previousCache || {}),
    ...Object.keys(nextCache || {}),
  ]);
  return [...keys].filter(key => {
    try {
      return JSON.stringify(previousCache?.[key] || null) !== JSON.stringify(nextCache?.[key] || null);
    } catch {
      return true;
    }
  });
}

function _notifyWorkoutCacheChanged(ownerId, changedDateKeys, source) {
  if (!changedDateKeys.length || typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent('data:workouts-updated', {
    detail: { ownerId, changedDateKeys, source },
  }));
}

export function stopWorkoutRealtimeSync() {
  _workoutRealtimeGeneration += 1;
  try { _workoutRealtimeUnsubscribe?.(); } catch {}
  _workoutRealtimeUnsubscribe = null;
  _workoutRealtimeOwnerId = null;
}

export function startWorkoutRealtimeSync(ownerId = getDataOwnerId()) {
  if (!ownerId) {
    stopWorkoutRealtimeSync();
    return;
  }
  if (_workoutRealtimeUnsubscribe && _workoutRealtimeOwnerId === ownerId) return;
  stopWorkoutRealtimeSync();
  _workoutRealtimeOwnerId = ownerId;
  const realtimeGeneration = ++_workoutRealtimeGeneration;
  const ownerWorkouts = collection(db, 'users', ownerId, 'workouts');
  _workoutRealtimeUnsubscribe = onSnapshot(ownerWorkouts, (snapshot) => {
    // An unsubscribe does not guarantee an already queued callback will not
    // run.  Without this token, a stale A callback after A → B can stop or
    // overwrite B's live subscription/cache.
    if (_workoutRealtimeGeneration !== realtimeGeneration) return;
    if (getDataOwnerId() !== ownerId) {
      stopWorkoutRealtimeSync();
      return;
    }
    const remoteCache = {};
    snapshot.forEach(documentSnapshot => {
      remoteCache[documentSnapshot.id] = documentSnapshot.data();
    });
    const nextCache = restorePendingDayWritesForOwner(ownerId, remoteCache);
    if (getDataOwnerId() !== ownerId) return;
    const changedDateKeys = _changedWorkoutDateKeys(_cache, nextCache);
    _setCache(nextCache);
    _notifyWorkoutCacheChanged(ownerId, changedDateKeys, 'firestore');
  }, (error) => {
    if (_workoutRealtimeGeneration !== realtimeGeneration) return;
    if (getDataOwnerId() === ownerId) {
      console.warn('[data] workout realtime sync deferred:', error?.message || error);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// Selected shared-account owner boundary
// ═══════════════════════════════════════════════════════════════
// After owner resolution every normal read/write uses exactly one SSOT. Missing
// selected-owner documents are authoritative absences; TomatoDev never revives
// fields or documents from another alias or legacy root.

// ═══════════════════════════════════════════════════════════════
// Disabled browser migration compatibility exports
// ═══════════════════════════════════════════════════════════════
// Older callers may still invoke these exports. Resolve the owner read-only,
// then return an explicit no-op instead of copying a workout runRouteRef without
// its nested running_routes/{routeId}/chunks documents.
export async function migrateDataToUser(userId) {
  const resolvedOwnerId = isSharedAdminAccount(userId)
    ? await resolveDataOwnerIdForAccount(userId)
    : String(userId || '').trim();
  if (!resolvedOwnerId) throw new Error('Data migration requires a resolved owner');
  return 0;
}

export async function unifySharedAccountData(targetUserId = getDataOwnerId()) {
  if (!isSharedAdminAccount(targetUserId)) {
    throw new Error('Shared account unification requires a resolved shared owner');
  }
  return { state: 'disabled', ownerId: targetUserId, copied: 0 };
}

// ═══════════════════════════════════════════════════════════════
// loadAll — 앱 시작 시 전체 데이터 로드
// ═══════════════════════════════════════════════════════════════
async function _resolveSharedOwnerAndReload(loadGeneration, sessionUserId) {
  const selectedOwnerId = await resolveDataOwnerIdForAccount(sessionUserId);
  if (_loadAllGeneration !== loadGeneration
      || String(getCurrentUserRef()?.id || '').trim() !== sessionUserId) return;

  const priorOwnerId = getAccountOwnerAliases(selectedOwnerId, selectedOwnerId)
    .find((candidate) => candidate !== selectedOwnerId);
  if (priorOwnerId && typeof globalThis.localStorage !== 'undefined') {
    // Keep the owner unresolved until every replacement journal is durable.
    // If localStorage is full, this throws and all shared-account writes remain
    // fenced instead of activating an owner with stranded alias changes.
    reassignPendingDayWrites(globalThis.localStorage, {
      fromOwnerId: priorOwnerId,
      toOwnerId: selectedOwnerId,
    });
  }
  setResolvedSharedAccountOwnerId(selectedOwnerId);
  return loadAll();
}

export async function loadAll() {
  const loadGeneration = ++_loadAllGeneration;
  const sessionUserId = String(getCurrentUserRef()?.id || '').trim();
  if (isSharedAdminAccount(sessionUserId) && !hasResolvedSharedAccountOwner()) {
    return _resolveSharedOwnerAndReload(loadGeneration, sessionUserId);
  }
  const ownerId = getDataOwnerId();
  if (!ownerId) {
    // 이전 계정 캐시를 로그인 화면이나 다음 계정에 노출하지 않는다.
    stopWorkoutRealtimeSync();
    _setCache({});
    _setSyncStatus('err');
    return;
  }

  const ownerCollection = (name) => collection(db, 'users', ownerId, name);
  const isCurrentLoad = () => (
    _loadAllGeneration === loadGeneration && getDataOwnerId() === ownerId
  );
  const abandonIfStale = () => {
    if (isCurrentLoad()) return false;
    // 새 loadAll이 이미 시작됐다면 그 실행이 소유한 캐시를 건드리지 않는다.
    if (_loadAllGeneration === loadGeneration) {
      const currentOwnerId = getDataOwnerId();
      _setCache(currentOwnerId ? restorePendingDayWritesForOwner(currentOwnerId, {}) : {});
    }
    return true;
  };
  const pendingSeed = restorePendingDayWritesForOwner(ownerId, {});
  // 원격 getDocs가 느리거나 앱 bootstrap timeout을 넘겨도 새로고침 직후
  // 기기에 보관된 식단/운동부터 복원한다.
  if (abandonIfStale()) return;
  _setCache(pendingSeed);

  try {
    if (abandonIfStale()) return;

    const [snap, exSnap, goalSnap, questSnap,
           cookSnap, checkinSnap, nutritionSnap,
           tomatoSnap, settingsSnap] = await Promise.all([
      getDocs(ownerCollection('workouts')),
      getDocs(ownerCollection('exercises')),
      getDocs(ownerCollection('goals')),
      getDocs(ownerCollection('quests')),
      getDocs(ownerCollection('cooking')),
      getDocs(ownerCollection('body_checkins')),
      getDocs(ownerCollection('nutrition_db')),
      getDocs(ownerCollection('tomato_cycles')),
      getDocs(ownerCollection('settings')),
    ]);

    if (abandonIfStale()) return;
    const remoteCache = {};
    snap.forEach(d => { remoteCache[d.id] = d.data(); });
    // 원격 snapshot 뒤에 load 시작 시점 pending, 그 뒤 현재 pending을 덮어
    // 쓴다. flush ack와 snapshot 간 순서가 엇갈려도 로컬 최신 변경이 이긴다.
    const remoteWithSeed = { ...remoteCache };
    Object.entries(pendingSeed).forEach(([dateKey, pendingDay]) => {
      remoteWithSeed[dateKey] = { ...(remoteWithSeed[dateKey] || {}), ...pendingDay };
    });
    _setCache(restorePendingDayWritesForOwner(ownerId, remoteWithSeed));

    const fbMap = {};
    settingsSnap.forEach(d => { fbMap[d.id] = d.data().value; });

    const storedExercises = [];
    exSnap.forEach(d => storedExercises.push(d.data()));
    const seedPlan = buildExerciseCatalogSeedPlan({
      defaultExercises: CONFIG.DEFAULT_EXERCISES,
      storedExercises,
      seedState: fbMap[EXERCISE_CATALOG_SEED_KEY],
      now: Date.now(),
    });
    // Seed defaults are presentation fallback only. Bootstrap never persists
    // exercises or a seed marker in TomatoDev.
    if (abandonIfStale()) return;
    _setExList(_sortExList(seedPlan.exercises.map(ex => normalizeExerciseMovementRecord(ex, MOVEMENTS))));
    try {
      const customMuscleSnap = await getDocs(ownerCollection('custom_muscles'));
      if (abandonIfStale()) return;
      const customMuscles = [];
      customMuscleSnap.forEach(d => customMuscles.push({ id: d.id, ...d.data() }));
      _setCustomMuscles(customMuscles);
    } catch (e) {
      if (abandonIfStale()) return;
      // rules 미반영/권한 오류가 있어도 로그인/기존 기능은 동작하도록 fail-safe
      console.warn('[data] custom_muscles load skipped:', e?.message || e);
      _setCustomMuscles([]);
    }

    { const g = []; goalSnap.forEach(d => g.push(d.data())); _setGoals(g); }
    { const q = []; questSnap.forEach(d => q.push(d.data())); _setQuests(q); }
    { const c = []; cookSnap.forEach(d => c.push(d.data())); _setCooking(c); }
    { const bc = []; checkinSnap.forEach(d => bc.push(d.data())); _setBodyCheckins(bc); }
    { const ndb = []; nutritionSnap.forEach(d => ndb.push(d.data())); _setNutritionDB(ndb); }

    if (_nutritionDB.length === 0 && !isAdmin() && !isAdminGuest()) {
      resolveDataOwnerIdForAccount(ADMIN_ID)
        .then((sharedAdminOwnerId) => getDocs(collection(db, 'users', sharedAdminOwnerId, 'nutrition_db')))
        .then(sharedSnap => {
        if (!isCurrentLoad()) return;
        const sharedItems = [];
        sharedSnap.forEach(d => sharedItems.push(d.data()));
        if (sharedItems.length > 0) {
          _setNutritionDB(sharedItems);
        }
        }).catch(e => console.warn('[data] 관리자 영양DB 로드 실패:', e.message));
    }

    { const tc = []; tomatoSnap.forEach(d => tc.push(d.data())); _setTomatoCycles(tc); }

    _settings.quest_order    = fbMap.quest_order    ?? ['quarterly','monthly','weekly','daily'];
    _settings.section_titles = fbMap.section_titles ?? {};
    _settings.mini_memo_items= fbMap.mini_memo_items?? [];
    _settings.weekly_memos   = fbMap.weekly_memos   ?? {};
    _settings.tab_order      = _sanitizeTabList(fbMap.tab_order ?? DEFAULT_TAB_ORDER);
    _settings.visible_tabs   = fbMap.visible_tabs ? _sanitizeTabList(fbMap.visible_tabs) : null;
    _settings.diet_plan = fbMap.diet_plan ?? null;
    if ((isAdmin() || isAdminGuest()) && !_settings.diet_plan) {
      // B3: diet_restored_admin 플래그를 Firestore에서 관리 (localStorage 기기 단위 → 유저별 Firestore)
      const dietRestored = fbMap.admin_diet_restored;
      if (!dietRestored) {
        _settings.diet_plan = {
          height: 175, weight: 75, bodyFatPct: 17, age: 32,
          targetWeight: 68, targetBodyFatPct: 8,
          activityFactor: 1.3, lossRatePerWeek: 0.009,
          refeedKcal: 5000, refeedDays: [0, 6], startDate: null,
        };
      }
    }
    _settings.home_streak_days = fbMap.home_streak_days ?? 6;
    _settings.unit_goal_start  = fbMap.unit_goal_start  ?? null;
    // TomatoDev shares the operating Firestore backend. Never hydrate its
    // legacy settings/active_timer pointer into the development runtime;
    // workout timer and draft recovery is namespaced local state only.
    _settings.active_timer     = null;
    _settings.max_cycle        = fbMap.max_cycle        ?? null;
    _settings.test_board_v2    = fbMap.test_board_v2    ?? null;
    _settings.season_registry  = fbMap.season_registry  ?? { schemaVersion: 2, seasons: [] };
    Object.entries(fbMap).forEach(([key, value]) => {
      if (/^season_.+_(?:workout_plan|test_board_v2|running_plan)$/.test(key)) {
        _settings[key] = value;
      }
    });
    _settings.exercise_catalog_seed = fbMap.exercise_catalog_seed ?? null;
    _settings.cheer_last_seen  = fbMap.cheer_last_seen  ?? 0;
    _settings.tomato_state     = fbMap.tomato_state     ?? { quarterlyTomatoes: {}, totalTomatoes: 0, giftedReceived: 0, giftedSent: 0 };
    _settings.milestone_shown  = fbMap.milestone_shown  ?? {};
    _settings.streak_freezes   = fbMap.streak_freezes   ?? [];
    _settings.diet_premium_report_inbox = fbMap.diet_premium_report_inbox ?? null;
    _settings.diet_premium_report_seen = fbMap.diet_premium_report_seen ?? {};
    _settings.expert_preset    = fbMap.expert_preset
      ? { ...DEFAULT_EXPERT_PRESET, ...fbMap.expert_preset }
      : { ...DEFAULT_EXPERT_PRESET };
    const maxCyclePlan = buildMaxCycleCanonicalPlan({
      expertPreset: _settings.expert_preset,
      settingCycle: _settings.max_cycle,
      now: Date.now(),
    });
    if (maxCyclePlan.shouldWriteMaxCycle) {
      _settings.max_cycle = maxCyclePlan.canonicalCycle;
    }
    if (maxCyclePlan.shouldWriteExpertPreset) {
      _settings.expert_preset = maxCyclePlan.cleanedPreset;
    }
    if (_settings.diet_plan) _setDietPlan({ ...DEFAULT_DIET_PLAN, ..._settings.diet_plan });

    // 전문가 모드: Gym / RoutineTemplate 로드 (실패해도 전체 앱 동작 유지)
    await Promise.all([loadGyms(ownerId), loadRoutineTemplates(ownerId), loadEquipmentPool(ownerId)]).catch(e =>
      console.warn('[data] expert equipment load skipped:', e?.message || e)
    );
    if (abandonIfStale()) return;

    _setSyncStatus('ok');
  } catch(e) {
    if (abandonIfStale()) return;
    _setSyncStatus('err');
    console.error('[data] loadAll:', e);
    _setExList([...CONFIG.DEFAULT_EXERCISES]);
    _setCustomMuscles([]);
    _settings.quest_order    = ['quarterly','monthly','weekly','daily'];
    _settings.section_titles = {};
    _settings.weekly_memos   = {};
    _settings.season_registry = { schemaVersion: 2, seasons: [] };
  } finally {
    if (isCurrentLoad()) {
      startWorkoutRealtimeSync(ownerId);
      initializePendingDayWriteSync();
      void flushPendingDayWrites(ownerId).catch(error => {
        console.warn('[data] pending day startup sync deferred:', error?.message || error);
      });
    }
  }
}
