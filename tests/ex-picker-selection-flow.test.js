import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modalHtml = await readFile(new URL('../modals/ex-picker-modal.js', import.meta.url), 'utf8');
const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');

test('exercise picker keeps footer done button as a fallback close control', () => {
  assert.match(modalHtml, /id="ex-picker-done"/);
  assert.match(modalHtml, /class="ex-picker-footer"/);
});

test('exercise picker row selection closes picker immediately after adding exercise', () => {
  const pushIndex = exercisesJs.indexOf('S.workout.exercises.push(_buildPickerExerciseEntry(ex))');
  assert.ok(pushIndex > 0, 'missing picker row exercise push');
  const selectionHandler = exercisesJs.slice(Math.max(0, pushIndex - 260), pushIndex + 620);
  assert.match(selectionHandler, /btn\.addEventListener\('click', \(\) => \{/);
  assert.match(selectionHandler, /_renderExerciseList\(\)/);
  assert.match(selectionHandler, /wtCloseExercisePicker\(\)/);
  assert.doesNotMatch(selectionHandler, /btn\.classList\.add\('already'\)/);
  assert.doesNotMatch(selectionHandler, /name\.textContent/);
});
