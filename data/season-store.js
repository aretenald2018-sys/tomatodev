import {
  _doc,
  _exList,
  _fbOp,
  _settings,
  db,
  runTransaction,
} from './data-core.js';
import {
  findSeasonForDate,
  normalizeSeasonRegistry,
  seasonContainsDate,
} from './season-model.js';
import {
  normalizeSeasonRequestId,
  prepareWorkoutSeasonCreation,
  prepareWorkoutSeasonUpdate,
} from './season-creation.js';
import {
  TOMATODEV_ACTIVE_SEASON_BOARD_KEY,
  TOMATODEV_SEASON_REGISTRY_KEY,
  tomatoDevSeasonBoardKey,
  tomatoDevSeasonRunningPlanKey,
  tomatoDevSeasonWorkoutPlanKey,
} from './season-storage.js';

function _clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function getSeasonRegistry() {
  return normalizeSeasonRegistry(_settings[TOMATODEV_SEASON_REGISTRY_KEY] || _settings.season_registry || {});
}

export function getSeasonWorkoutPlan(seasonId) {
  return _clone(_settings[tomatoDevSeasonWorkoutPlanKey(seasonId)] || null);
}

export function getSeasonTestBoardV2(seasonId) {
  return _clone(_settings[tomatoDevSeasonBoardKey(seasonId)] || null);
}

export function getSeasonRunningPlan(seasonId) {
  return _clone(_settings[tomatoDevSeasonRunningPlanKey(seasonId)] || null);
}

export function getSeasonBundleForDate(dateKey) {
  const registry = getSeasonRegistry();
  const season = findSeasonForDate(registry, dateKey);
  if (!season) return { registry, season: null, workoutPlan: null, board: null, runningPlan: null };
  return {
    registry,
    season,
    workoutPlan: getSeasonWorkoutPlan(season.id),
    board: getSeasonTestBoardV2(season.id),
    runningPlan: getSeasonRunningPlan(season.id),
  };
}

export async function createWorkoutSeason(input = {}) {
  const clientRequestId = normalizeSeasonRequestId(input.clientRequestId);
  const refs = {
    registry: _doc('settings', TOMATODEV_SEASON_REGISTRY_KEY),
    activeBoard: _doc('settings', TOMATODEV_ACTIVE_SEASON_BOARD_KEY),
  };
  const result = await _fbOp('createWorkoutSeason', () => runTransaction(db, async (transaction) => {
    const registrySnap = await transaction.get(refs.registry);
    const boardSnap = await transaction.get(refs.activeBoard);
    const registry = normalizeSeasonRegistry(registrySnap.exists() ? registrySnap.data()?.value : getSeasonRegistry());
    const duplicate = registry.seasons.find(season => season.clientRequestId === clientRequestId);
    if (duplicate) {
      return {
        duplicate: true,
        season: duplicate,
        registry,
        board: _settings[tomatoDevSeasonBoardKey(duplicate.id)] || null,
        workoutPlan: _settings[tomatoDevSeasonWorkoutPlanKey(duplicate.id)] || null,
        runningPlan: _settings[tomatoDevSeasonRunningPlanKey(duplicate.id)] || null,
      };
    }
    const prepared = prepareWorkoutSeasonCreation({
      ...input,
      clientRequestId,
      registry,
      previousBoard: boardSnap.exists() ? boardSnap.data()?.value : (_settings[TOMATODEV_ACTIVE_SEASON_BOARD_KEY] || null),
      registeredExercises: input.registeredExercises || _exList,
      registeredExerciseIds: input.registeredExerciseIds || _exList.map(exercise => exercise.id).filter(Boolean),
    });
    const seasonId = prepared.season.id;
    const planKey = tomatoDevSeasonWorkoutPlanKey(seasonId);
    const boardKey = tomatoDevSeasonBoardKey(seasonId);
    const runningKey = tomatoDevSeasonRunningPlanKey(seasonId);
    transaction.set(refs.registry, { value: prepared.registry });
    transaction.set(_doc('settings', planKey), { value: prepared.workoutPlan });
    transaction.set(_doc('settings', boardKey), { value: prepared.board });
    transaction.set(_doc('settings', runningKey), { value: prepared.runningPlan });
    const activated = seasonContainsDate(prepared.season, input.todayKey || '');
    if (activated) transaction.set(refs.activeBoard, { value: prepared.board });
    return { ...prepared, activated };
  }), { rethrow: true });

  if (!result) throw new Error('season transaction did not return a result');
  _settings[TOMATODEV_SEASON_REGISTRY_KEY] = result.registry;
  _settings.season_registry = result.registry;
  if (result.board) {
    if (result.activated) _settings[TOMATODEV_ACTIVE_SEASON_BOARD_KEY] = result.board;
    _settings[tomatoDevSeasonBoardKey(result.season.id)] = result.board;
  }
  if (result.workoutPlan) _settings[tomatoDevSeasonWorkoutPlanKey(result.season.id)] = result.workoutPlan;
  if (result.runningPlan) _settings[tomatoDevSeasonRunningPlanKey(result.season.id)] = result.runningPlan;
  return _clone(result);
}

export async function updateWorkoutSeason(input = {}) {
  const seasonId = String(input.season?.id || '').trim();
  if (!seasonId) throw new TypeError('season id is required');
  const boardKey = tomatoDevSeasonBoardKey(seasonId);
  const planKey = tomatoDevSeasonWorkoutPlanKey(seasonId);
  const runningKey = tomatoDevSeasonRunningPlanKey(seasonId);
  const refs = {
    registry: _doc('settings', TOMATODEV_SEASON_REGISTRY_KEY),
    activeBoard: _doc('settings', TOMATODEV_ACTIVE_SEASON_BOARD_KEY),
    board: _doc('settings', boardKey),
  };
  const result = await _fbOp('updateWorkoutSeason', () => runTransaction(db, async (transaction) => {
    const [registrySnap, boardSnap] = await Promise.all([
      transaction.get(refs.registry),
      transaction.get(refs.board),
    ]);
    const registry = normalizeSeasonRegistry(registrySnap.exists() ? registrySnap.data()?.value : getSeasonRegistry());
    const previousBoard = boardSnap.exists() ? boardSnap.data()?.value : (_settings[boardKey] || null);
    const prepared = prepareWorkoutSeasonUpdate({
      ...input,
      registry,
      previousBoard,
      existingWorkoutPlan: _settings[planKey] || null,
      existingRunningPlan: _settings[runningKey] || null,
    });
    transaction.set(refs.registry, { value: prepared.registry });
    transaction.set(refs.board, { value: prepared.board });
    transaction.set(_doc('settings', planKey), { value: prepared.workoutPlan });
    transaction.set(_doc('settings', runningKey), { value: prepared.runningPlan });
    const activated = seasonContainsDate(prepared.season, input.todayKey || '');
    if (activated) transaction.set(refs.activeBoard, { value: prepared.board });
    return { ...prepared, activated };
  }), { rethrow: true });

  if (!result) throw new Error('season update transaction did not return a result');
  _settings[TOMATODEV_SEASON_REGISTRY_KEY] = result.registry;
  _settings.season_registry = result.registry;
  _settings[boardKey] = result.board;
  if (result.activated) _settings[TOMATODEV_ACTIVE_SEASON_BOARD_KEY] = result.board;
  _settings[planKey] = result.workoutPlan;
  _settings[runningKey] = result.runningPlan;
  return _clone(result);
}
