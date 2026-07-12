import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPickerExercisesByGym,
  isConcretePickerGymFilter,
  isPickerExerciseEditable,
  isPickerExerciseGlobalScope,
  isPickerExerciseUsableAtGym,
  normalizePickerGymFilter,
  pickerExerciseGymIds,
  pickerExerciseGymKey,
  pickerExerciseSourceMeta,
} from '../workout/picker-gym-scope.js';

const globalExercise = { id: 'bench', movementId: 'bench' };
const gymAExercise = { id: 'custom_a', movementId: 'press', gymId: 'gym-a' };
const gymBExercise = { id: 'machine_b', movementId: 'row', gymTags: ['gym-b', 'gym-b'] };

test('picker gym scope normalizes exercise ownership and editable state', () => {
  assert.deepEqual(pickerExerciseGymIds(gymBExercise), ['gym-b']);
  assert.equal(pickerExerciseGymKey(gymAExercise), 'gym-a');
  assert.equal(isPickerExerciseGlobalScope(globalExercise), true);
  assert.equal(isPickerExerciseGlobalScope({ gymTags: ['*', 'gym-a'] }), true);
  assert.equal(isPickerExerciseEditable(globalExercise), false);
  assert.equal(isPickerExerciseEditable(gymAExercise), true);
  assert.equal(isPickerExerciseEditable({ id: 'custom_without_movement' }), true);
});

test('picker gym scope preserves global exercises for current and filtered gyms', () => {
  assert.equal(normalizePickerGymFilter(''), 'all');
  assert.equal(isConcretePickerGymFilter('gym-a'), true);
  assert.equal(isConcretePickerGymFilter('usable'), false);
  assert.equal(isPickerExerciseUsableAtGym(globalExercise, 'gym-a', 'gym-b'), true);
  assert.equal(isPickerExerciseUsableAtGym(gymAExercise, 'usable', 'gym-a'), true);
  assert.equal(isPickerExerciseUsableAtGym(gymAExercise, 'usable', 'gym-b'), false);
  assert.equal(isPickerExerciseUsableAtGym(gymBExercise, 'global', 'gym-b'), false);

  const pool = [globalExercise, gymAExercise, gymBExercise];
  assert.deepEqual(filterPickerExercisesByGym(pool, 'all', 'gym-a'), pool);
  assert.deepEqual(filterPickerExercisesByGym(pool, 'gym-a', 'gym-a'), [globalExercise, gymAExercise]);
  assert.deepEqual(filterPickerExercisesByGym(pool, 'usable', 'gym-b'), [globalExercise, gymBExercise]);
  assert.deepEqual(filterPickerExercisesByGym(pool, 'global', 'gym-a'), [globalExercise]);
});

test('picker gym source metadata exposes current, other, and global labels', () => {
  const gyms = [{ id: 'gym-a', name: '강남점' }, { id: 'gym-b', name: '홍대점' }];
  assert.deepEqual(pickerExerciseSourceMeta(globalExercise, { gyms, currentGymId: 'gym-a' }), {
    label: '공통', detail: '모든 헬스장', cls: 'global', filterId: 'global', actionLabel: '공통 기구만 보기',
  });
  assert.deepEqual(pickerExerciseSourceMeta(gymAExercise, { gyms, currentGymId: 'gym-a' }), {
    label: '강남점', detail: '전용 기구', cls: 'current', filterId: 'gym-a', actionLabel: '강남점 기구만 보기',
  });
  assert.deepEqual(pickerExerciseSourceMeta(gymBExercise, { gyms, currentGymId: 'gym-a' }), {
    label: '홍대점', detail: '전용 기구', cls: 'other', filterId: 'gym-b', actionLabel: '홍대점 기구만 보기',
  });
});
