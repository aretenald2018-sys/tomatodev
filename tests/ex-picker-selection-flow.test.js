import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modalHtml = await readFile(new URL('../modals/ex-picker-modal.js', import.meta.url), 'utf8');
const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');

test('exercise picker no longer renders footer done controls', () => {
  assert.doesNotMatch(modalHtml, /id="ex-picker-done"/);
  assert.doesNotMatch(modalHtml, /class="ex-picker-footer"/);
});

test('exercise picker row selection closes picker and focuses the selected record card by default', () => {
  const pushIndex = exercisesJs.indexOf('const entryIdx = S.workout.exercises.push(_buildPickerExerciseEntry(ex)) - 1');
  assert.ok(pushIndex > 0, 'missing picker row exercise push');
  const selectionHandler = exercisesJs.slice(Math.max(0, pushIndex - 760), pushIndex + 1180);
  assert.match(selectionHandler, /btn\.addEventListener\('click', async \(\) => \{/);
  assert.match(selectionHandler, /const afterSelect = _consumePickerAfterSelect\(\)/);
  assert.match(selectionHandler, /const existingIdx = _findWorkoutEntryIndexByExerciseId\(ex\.id\)/);
  assert.match(selectionHandler, /wtFocusWorkoutEntryCard\(existingIdx\)/);
  assert.match(selectionHandler, /_renderExerciseList\(\)/);
  assert.match(selectionHandler, /wtCloseExercisePicker\(\)/);
  assert.match(selectionHandler, /const savePromise = saveWorkoutDay\(\{ silent: true, keepDraftExercises: !!afterSelect \}\)/);
  assert.match(selectionHandler, /wtFocusWorkoutEntryCard\(entryIdx\)/);
  assert.doesNotMatch(selectionHandler, /pushWorkoutDetail/);
  assert.doesNotMatch(selectionHandler, /btn\.classList\.add\('already'\)/);
  assert.doesNotMatch(selectionHandler, /name\.textContent/);
});

test('exercise picker supports sheet afterSelect without record-card focus', () => {
  assert.match(exercisesJs, /let _pickerAfterSelect = null/);
  assert.match(exercisesJs, /function _consumePickerAfterSelect\(\)/);
  assert.match(exercisesJs, /async function _runPickerAfterSelect\(handler, detail = \{\}\)/);
  assert.match(exercisesJs, /export async function wtOpenExercisePicker\(options = \{\}\)/);
  assert.match(exercisesJs, /Object\.prototype\.hasOwnProperty\.call\(options \|\| \{\}, 'afterSelect'\)/);
  const pushIndex = exercisesJs.indexOf('const entryIdx = S.workout.exercises.push(_buildPickerExerciseEntry(ex)) - 1');
  const selectionHandler = exercisesJs.slice(Math.max(0, pushIndex - 760), pushIndex + 1180);
  assert.match(selectionHandler, /if \(afterSelect\) \{[\s\S]*_runPickerAfterSelect\(afterSelect,[\s\S]*existing:\s*true/);
  assert.match(selectionHandler, /saveWorkoutDay\(\{ silent: true, keepDraftExercises: !!afterSelect \}\)/);
  assert.match(selectionHandler, /if \(afterSelect\) \{[\s\S]*await savePromise;[\s\S]*_runPickerAfterSelect\(afterSelect,[\s\S]*existing:\s*false/);
  assert.match(selectionHandler, /if \(afterSelect\) \{[\s\S]*return;[\s\S]*\}[\s\S]*wtFocusWorkoutEntryCard\(entryIdx\)/);
});
