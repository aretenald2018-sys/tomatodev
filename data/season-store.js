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

function _clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function _settingKey(seasonId, suffix) {
  const id = String(seasonId || '').trim();
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new TypeError('invalid season id');
  return `season_${id}_${suffix}`;
}

export function getSeasonRegistry() {
  return normalizeSeasonRegistry(_settings.season_registry || {});
}

export function getSeasonWorkoutPlan(seasonId) {
  return _clone(_settings[_settingKey(seasonId, 'workout_plan')] || null);
}

export function getSeasonTestBoardV2(seasonId) {
  return _clone(_settings[_settingKey(seasonId, 'test_board_v2')] || null);
}

export function getSeasonRunningPlan(seasonId) {
  return _clone(_settings[_settingKey(seasonId, 'running_plan')] || null);
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
    registry: _doc('settings', 'season_registry'),
    activeBoard: _doc('settings', 'test_board_v2'),
  };
  const result = await _fbOp('createWorkoutSeason', () => runTransaction(db, async (transaction) => {
    const registrySnap = await transaction.get(refs.registry);
    const boardSnap = await transaction.get(refs.activeBoard);
    const registry = normalizeSeasonRegistry(registrySnap.exists() ? registrySnap.data()?.value : _settings.season_registry);
    const duplicate = registry.seasons.find(season => season.clientRequestId === clientRequestId);
    if (duplicate) {
      return {
        duplicate: true,
        season: duplicate,
        registry,
        board: _settings[_settingKey(duplicate.id, 'test_board_v2')] || null,
        workoutPlan: _settings[_settingKey(duplicate.id, 'workout_plan')] || null,
        runningPlan: _settings[_settingKey(duplicate.id, 'running_plan')] || null,
      };
    }
    const prepared = prepareWorkoutSeasonCreation({
      ...input,
      clientRequestId,
      registry,
      previousBoard: boardSnap.exists() ? boardSnap.data()?.value : (_settings.test_board_v2 || null),
      registeredExercises: input.registeredExercises || _exList,
      registeredExerciseIds: input.registeredExerciseIds || _exList.map(exercise => exercise.id).filter(Boolean),
    });
    const seasonId = prepared.season.id;
    const planKey = _settingKey(seasonId, 'workout_plan');
    const boardKey = _settingKey(seasonId, 'test_board_v2');
    const runningKey = _settingKey(seasonId, 'running_plan');
    transaction.set(refs.registry, { value: prepared.registry });
    transaction.set(_doc('settings', planKey), { value: prepared.workoutPlan });
    transaction.set(_doc('settings', boardKey), { value: prepared.board });
    transaction.set(_doc('settings', runningKey), { value: prepared.runningPlan });
    const activated = seasonContainsDate(prepared.season, input.todayKey || '');
    if (activated) transaction.set(refs.activeBoard, { value: prepared.board });
    return { ...prepared, activated };
  }), { rethrow: true });

  if (!result) throw new Error('season transaction did not return a result');
  _settings.season_registry = result.registry;
  if (result.board) {
    if (result.activated) _settings.test_board_v2 = result.board;
    _settings[_settingKey(result.season.id, 'test_board_v2')] = result.board;
  }
  if (result.workoutPlan) _settings[_settingKey(result.season.id, 'workout_plan')] = result.workoutPlan;
  if (result.runningPlan) _settings[_settingKey(result.season.id, 'running_plan')] = result.runningPlan;
  return _clone(result);
}

export async function updateWorkoutSeason(input = {}) {
  const seasonId = String(input.season?.id || '').trim();
  if (!seasonId) throw new TypeError('season id is required');
  const boardKey = _settingKey(seasonId, 'test_board_v2');
  const planKey = _settingKey(seasonId, 'workout_plan');
  const runningKey = _settingKey(seasonId, 'running_plan');
  const refs = {
    registry: _doc('settings', 'season_registry'),
    activeBoard: _doc('settings', 'test_board_v2'),
    board: _doc('settings', boardKey),
  };
  const result = await _fbOp('updateWorkoutSeason', () => runTransaction(db, async (transaction) => {
    const [registrySnap, boardSnap] = await Promise.all([
      transaction.get(refs.registry),
      transaction.get(refs.board),
    ]);
    const registry = normalizeSeasonRegistry(registrySnap.exists() ? registrySnap.data()?.value : _settings.season_registry);
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
  _settings.season_registry = result.registry;
  _settings[boardKey] = result.board;
  if (result.activated) _settings.test_board_v2 = result.board;
  _settings[planKey] = result.workoutPlan;
  _settings[runningKey] = result.runningPlan;
  return _clone(result);
}
