import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modalHtml = await readFile(new URL('../modals/ex-picker-modal.js', import.meta.url), 'utf8');
const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');

test('exercise picker no longer renders footer done controls', () => {
  assert.doesNotMatch(modalHtml, /id="ex-picker-done"/);
  assert.doesNotMatch(modalHtml, /class="ex-picker-footer"/);
});

test('exercise picker row selection closes picker and opens the selected exercise detail', () => {
  const pushIndex = exercisesJs.indexOf('const entryIdx = S.workout.exercises.push(_buildPickerExerciseEntry(ex)) - 1');
  assert.ok(pushIndex > 0, 'missing picker row exercise push');
  const selectionHandler = exercisesJs.slice(Math.max(0, pushIndex - 520), pushIndex + 760);
  assert.match(selectionHandler, /btn\.addEventListener\('click', \(\) => \{/);
  assert.match(selectionHandler, /const existingIdx = _findWorkoutEntryIndexByExerciseId\(ex\.id\)/);
  assert.match(selectionHandler, /_openWorkoutEntryDetail\(existingIdx\)/);
  assert.match(selectionHandler, /_renderExerciseList\(\)/);
  assert.match(selectionHandler, /wtCloseExercisePicker\(\)/);
  assert.match(selectionHandler, /_openWorkoutEntryDetail\(entryIdx\)/);
  assert.doesNotMatch(selectionHandler, /btn\.classList\.add\('already'\)/);
  assert.doesNotMatch(selectionHandler, /name\.textContent/);
});
