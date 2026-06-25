import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const styleCss = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const swJs = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

test('exercise editor renders program controls backed by test_board_v2', () => {
  assert.match(exercisesJs, /getTestBoardV2,\s*saveTestBoardV2/);
  assert.match(exercisesJs, /getExerciseProgramSettings/);
  assert.match(exercisesJs, /upsertExerciseProgramBenchmark/);
  assert.match(exercisesJs, /id = 'ex-editor-program-wrap'/);
  assert.match(exercisesJs, /data-ex-program-mode="\$\{item\.id\}"/);
  assert.match(exercisesJs, /data-ex-program-mode="custom"[\s\S]*disabled/);
  assert.match(exercisesJs, /id="ex-program-wendler-tm"/);
  assert.match(exercisesJs, /id="ex-program-wendler-supp"/);
  assert.match(exercisesJs, /const todayKey = _todayDateKey\(\) \|\| dateKey/);
  assert.match(exercisesJs, /todayKey,\s*\n\s*movements: MOVEMENTS/);
  assert.doesNotMatch(exercisesJs, /todayKey:\s*dateKey,/);
});

test('exercise editor saves exercise before saving program contract', () => {
  const saveFlow = exercisesJs.slice(
    exercisesJs.indexOf('export async function wtSaveExerciseFromEditor'),
    exercisesJs.indexOf('export async function wtDeleteExerciseFromEditor'),
  );
  const saveExerciseIdx = saveFlow.indexOf('await saveExercise(record)');
  const verifyIdx = saveFlow.indexOf("throw new Error('saveExercise verification failed')");
  const saveProgramIdx = saveFlow.indexOf('await _saveExerciseProgramFromEditor(record)');
  assert.ok(saveExerciseIdx > 0, 'missing saveExercise call');
  assert.ok(verifyIdx > saveExerciseIdx, 'missing post-save verification before program save');
  assert.ok(saveProgramIdx > verifyIdx, 'program save should run after exercise verification');
});

test('exercise editor program controls have compact fixed layout styles', () => {
  assert.match(styleCss, /#ex-editor-modal \.ex-program-editor/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-seg/);
  assert.match(styleCss, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-grid-four/);
  assert.match(swJs, /tomatofarm-v20260625z62-exercise-program-editor/);
});
