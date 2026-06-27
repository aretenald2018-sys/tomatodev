import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const dataLoadJs = await readFile(new URL('../data/data-load.js', import.meta.url), 'utf8');
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
  assert.match(exercisesJs, /id="ex-program-start-date"/);
  assert.match(exercisesJs, /data-ex-program-calendar-toggle/);
  assert.match(exercisesJs, /function _renderProgramStartCalendar/);
  assert.match(exercisesJs, /class="ex-program-calendar-row"/);
  assert.match(exercisesJs, /programStartDate:\s*document\.getElementById\('ex-program-start-date'\)/);
  assert.match(exercisesJs, /data-ex-program-tm-calc/);
  assert.match(exercisesJs, /estimate1RM\(kg,\s*reps\)/);
  assert.match(exercisesJs, /id="ex-program-tm-calc-kg"/);
  assert.match(exercisesJs, /id="ex-program-tm-calc-reps"/);
  assert.match(exercisesJs, /실제 1RM보다 낮은 기준 중량/);
  assert.match(exercisesJs, /보조 세트에 쓰는 TM 비율/);
  assert.match(exercisesJs, /const todayKey = _todayDateKey\(\) \|\| dateKey/);
  assert.match(exercisesJs, /todayKey,\s*\n\s*movements: MOVEMENTS/);
  assert.doesNotMatch(exercisesJs, /todayKey:\s*dateKey,/);
  assert.doesNotMatch(exercisesJs, /id="ex-program-wendler-start"[^>]+type="number"/);
});

test('exercise editor saves exercise before saving program contract', () => {
  const saveFlow = exercisesJs.slice(
    exercisesJs.indexOf('export async function wtSaveExerciseFromEditor'),
    exercisesJs.indexOf('export async function wtDeleteExerciseFromEditor'),
  );
  const saveExerciseIdx = saveFlow.indexOf('await saveExercise(record)');
  const verifyIdx = saveFlow.indexOf("throw new Error('saveExercise verification failed')");
  const programRecordIdx = saveFlow.indexOf('const programRecord = saved || record');
  const saveProgramIdx = saveFlow.indexOf('await _saveExerciseProgramFromEditor(programRecord)');
  assert.ok(saveExerciseIdx > 0, 'missing saveExercise call');
  assert.ok(verifyIdx > saveExerciseIdx, 'missing post-save verification before program save');
  assert.ok(programRecordIdx > verifyIdx, 'program save should use the verified saved exercise record');
  assert.ok(saveProgramIdx > programRecordIdx, 'program save should run after choosing the verified exercise record');
});

test('exercise program board is rehydrated from settings on load', () => {
  assert.match(dataLoadJs, /_settings\.test_board_v2\s*=\s*fbMap\.test_board_v2\s*\?\?\s*null/);
});

test('exercise editor program controls have compact fixed layout styles', () => {
  assert.match(styleCss, /#ex-editor-modal \.ex-program-editor/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-seg/);
  assert.match(styleCss, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-grid-four/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-date-btn/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-mini-cal/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-calendar-row/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-mini-cal\s*{[\s\S]*?position:\s*static/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-compact-list/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-tm-calc/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-calc-btn/);
  assert.match(styleCss, /#ex-editor-modal \.ex-program-wendler \.ex-editor-input,[\s\S]*?min-height:\s*24px/);
  assert.match(swJs, /tomatofarm-v20260628z1-running-real-map/);
});
