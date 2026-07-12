import { clearSetCompletedAt, stampSetCompletedAt } from './timeline.js';

export const WORKOUT_SET_COMMANDS = Object.freeze({
  ADD_SET: 'add-set',
  REMOVE_SET: 'remove-set',
  RESTORE_SET: 'restore-set',
  UPDATE_SET: 'update-set',
  SET_DONE: 'set-done',
  MOVE_SET: 'move-set',
  REMOVE_ENTRY: 'remove-entry',
});

function _entry(workout, entryIndex) {
  return workout?.exercises?.[Math.max(0, Number(entryIndex) || 0)] || null;
}

function _set(workout, entryIndex, setIndex) {
  return _entry(workout, entryIndex)?.sets?.[Math.max(0, Number(setIndex) || 0)] || null;
}

export function applyWorkoutSetCommand(workout, command = {}, now = Date.now()) {
  if (!workout || !Array.isArray(workout.exercises)) return { changed: false, reason: 'invalid-workout' };
  const entryIndex = Math.max(0, Number(command.entryIndex) || 0);
  const setIndex = Math.max(0, Number(command.setIndex) || 0);
  const entry = _entry(workout, entryIndex);

  if (command.type === WORKOUT_SET_COMMANDS.REMOVE_ENTRY) {
    if (!entry) return { changed: false, reason: 'entry-not-found' };
    const [removed] = workout.exercises.splice(entryIndex, 1);
    return { changed: true, entryIndex, removed };
  }
  if (!entry) return { changed: false, reason: 'entry-not-found' };
  if (!Array.isArray(entry.sets)) entry.sets = [];

  if (command.type === WORKOUT_SET_COMMANDS.ADD_SET) {
    const previous = entry.sets.at(-1);
    const next = {
      kg: '',
      reps: '',
      rpe: previous?.rpe ?? null,
      romPct: previous?.romPct ?? 100,
      setType: 'main',
      done: false,
      ...(command.value && typeof command.value === 'object' ? command.value : {}),
    };
    entry.uiCollapsed = false;
    entry.sets.push(next);
    return { changed: true, entryIndex, setIndex: entry.sets.length - 1, value: next };
  }

  if (command.type === WORKOUT_SET_COMMANDS.REMOVE_SET) {
    if (!_set(workout, entryIndex, setIndex)) return { changed: false, reason: 'set-not-found' };
    const [removed] = entry.sets.splice(setIndex, 1);
    return { changed: true, entryIndex, setIndex, removed };
  }

  if (command.type === WORKOUT_SET_COMMANDS.RESTORE_SET) {
    if (!command.value || typeof command.value !== 'object') return { changed: false, reason: 'invalid-set' };
    const target = Math.min(setIndex, entry.sets.length);
    entry.sets.splice(target, 0, command.value);
    return { changed: true, entryIndex, setIndex: target, value: command.value };
  }

  const set = _set(workout, entryIndex, setIndex);
  if (!set) return { changed: false, reason: 'set-not-found' };

  if (command.type === WORKOUT_SET_COMMANDS.UPDATE_SET) {
    const field = String(command.field || '');
    if (!field) return { changed: false, reason: 'field-required' };
    if (command.remove === true) delete set[field];
    else set[field] = command.value;
    if (field === 'kg' || field === 'reps') {
      set.done = false;
      clearSetCompletedAt(set);
    }
    return { changed: true, entryIndex, setIndex, field, value: set[field] };
  }

  if (command.type === WORKOUT_SET_COMMANDS.SET_DONE) {
    const done = command.value === true;
    if (set.done === done) return { changed: false, reason: 'unchanged', value: done };
    set.done = done;
    if (done) stampSetCompletedAt(set, now);
    else clearSetCompletedAt(set);
    return { changed: true, entryIndex, setIndex, value: done };
  }

  if (command.type === WORKOUT_SET_COMMANDS.MOVE_SET) {
    const targetIndex = setIndex + Math.trunc(Number(command.direction) || 0);
    if (targetIndex < 0 || targetIndex >= entry.sets.length || targetIndex === setIndex) {
      return { changed: false, reason: 'out-of-range' };
    }
    [entry.sets[setIndex], entry.sets[targetIndex]] = [entry.sets[targetIndex], entry.sets[setIndex]];
    return { changed: true, entryIndex, setIndex, targetIndex };
  }

  return { changed: false, reason: 'unknown-command' };
}
