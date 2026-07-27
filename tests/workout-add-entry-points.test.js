import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { MODALS } from '../modal-manager.js';

function readProjectFile(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function sliceFunction(source, header, next) {
  const start = source.indexOf(header);
  assert.notEqual(start, -1, `${header} should exist`);
  const end = source.indexOf(next, start + header.length);
  assert.ok(end > start, `${next} should follow ${header}`);
  return source.slice(start, end);
}

test('every lazily injected modal template is precached', () => {
  const runtimeAssets = readProjectFile('runtime-assets.js');
  const listed = new Set([...runtimeAssets.matchAll(/'\.\/([^']+)'/g)].map(match => match[1]));

  // 코드 자산은 network-first이고, 캐시 버전이 바뀌면 이전 캐시는 삭제된다.
  // 정적 목록에 없는 템플릿은 배포 직후 오프라인에서 import가 실패하고,
  // 그 모달을 여는 버튼만 아무 반응 없이 죽는다.
  const missing = MODALS
    .map(config => config.path.replace('./', ''))
    .filter(path => !listed.has(path));

  assert.deepEqual(missing, [], `modal templates missing from runtime-assets.js: ${missing.join(', ')}`);
  assert.ok(MODALS.length >= 29, 'modal registry should still cover every template');
  assert.ok(listed.has('modals/ex-picker-modal.js'));
  assert.ok(listed.has('modals/ex-editor-modal.js'));
});

test('a missing template reports itself instead of dying silently', () => {
  const modalManager = readProjectFile('modal-manager.js');
  const exercises = readProjectFile('workout/exercises.js');

  // 일괄 로더는 allSettled로 실패를 삼킨다. 최소한 어떤 모달이 실패했는지는 남겨야
  // "이 버튼만 무반응" 증상의 원인을 추적할 수 있다.
  assert.match(modalManager, /results\.forEach\(\(result, index\) => \{[\s\S]*MODALS\[index\]\.id/);

  const openPicker = sliceFunction(
    exercises,
    'export async function wtOpenExercisePicker',
    'export function wtOpenExerciseEditor',
  );
  // 피커는 전체 모달 로더가 아니라 필요한 템플릿만 보장한다. 편집기 템플릿도
  // 같이 준비해야 헤더의 ＋가 곧바로 열린다.
  assert.match(openPicker, /_ensureWorkoutModal\('ex-picker-modal'\)/);
  assert.match(openPicker, /_ensureWorkoutModal\('ex-editor-modal'\)/);
  assert.doesNotMatch(openPicker, /loadAndInjectModals/);

  const ensure = sliceFunction(exercises, 'async function _ensureWorkoutModal', 'async function _openExerciseEditorEnsured');
  assert.match(ensure, /const \{ ensureModal \} = await import\('\.\.\/modal-manager\.js'\)/);
  assert.match(ensure, /console\.error\(`\[workout\] \$\{id\} load failed:`/);

  // 편집기를 여는 모든 경로가 템플릿을 먼저 확보한다.
  const openEnsured = sliceFunction(exercises, 'async function _openExerciseEditorEnsured', 'function _openPickerEditorFromHeader');
  assert.match(openEnsured, /await _ensureWorkoutModal\('ex-editor-modal'\)/);
  assert.match(exercises, /void _openExerciseEditorEnsured\(null, _pickerMuscleFilter \|\| null\)/);
  assert.match(exercises, /void _openExerciseEditorEnsured\(ex\.id, null\)/);
  assert.match(exercises, /void _openExerciseEditorEnsured\(null, muscle\.id\)/);
  // 실패는 토스트로 보인다. console.error만 남기면 버튼 고장으로만 읽힌다.
  assert.match(openPicker, /if \(!modal\) \{[\s\S]*showToast\([^)]*'error'\)[\s\S]*return;/);

  const openEditor = sliceFunction(
    exercises,
    'export function wtOpenExerciseEditor',
    'const allMuscles = getMuscleParts()',
  );
  // 가드가 없으면 아래 muscleSelect.parentElement 접근이 onclick 안에서 조용히 터진다.
  assert.match(openEditor, /if \(!editor \|\| !nameInput \|\| !muscleSelect\) \{[\s\S]*showToast\([^)]*'error'\)[\s\S]*return;/);
});

test('the picker gym rail can create a gym, not only select saved ones', () => {
  const exercises = readProjectFile('workout/exercises.js');

  const rail = sliceFunction(exercises, 'const gymRail = (ctx.gyms || []).map', 'export function _renderPickerList');
  assert.match(rail, /data-picker-action="add-gym"/);
  assert.match(rail, /＋ 헬스장 추가/);
  assert.match(rail, /data-picker-action="manage-gyms"/);
  assert.match(rail, /\[data-picker-action="add-gym"\]'\)\?\.addEventListener\('click', \(\) => \{\s*void _openPickerGymCreate\(\);/);

  const create = sliceFunction(exercises, 'async function _openPickerGymCreate', 'async function _openPickerEquipmentManager');
  assert.match(create, /await import\('\.\/expert\.js'\)/);
  assert.match(create, /wtExcAddNewGym\(\{/);
  // 피커는 이미 모달이다. 기구 위저드를 겹쳐 띄우지 않는다.
  assert.match(create, /startEquipmentSetup: false/);
  // 새 헬스장은 기구가 0개라 활성 범위로 바꾸면 종목이 전부 사라진다.
  assert.match(create, /afterSave: \(\) => _renderPickerList\(\)/);
  assert.doesNotMatch(create, /_wtSetPickerGymCategoryFilter/);
  assert.match(create, /showToast\([^)]*'error'\)/);
});

test('gym creation honors the caller flow and keeps its label honest', () => {
  const expert = readProjectFile('workout/expert.js');
  const addGym = sliceFunction(expert, 'export function wtExcAddNewGym', 'export function expertOpenGymSwitcher');

  assert.match(addGym, /const startsEquipmentSetup = options\.startEquipmentSetup !== false/);
  assert.match(addGym, /const saveLabel = startsEquipmentSetup \? '저장하고 기구 등록하기' : '헬스장 저장'/);
  assert.match(addGym, /data-action="save">\$\{saveLabel\}</);
  assert.match(addGym, /<div class="wt-gym-sheet-sub">\$\{subText\}<\/div>/);
  assert.match(addGym, /saveBtn\.textContent = saveLabel/);
  assert.match(addGym, /if \(typeof options\.afterSave === 'function'\)/);
  assert.match(addGym, /if \(!startsEquipmentSetup\) return;/);
  // 저장 자체는 기존 경로를 그대로 쓴다.
  assert.match(addGym, /await saveGym\(\{ id, name, createdAt: Date\.now\(\) \}\)/);
  assert.match(addGym, /await saveExpertPreset\(\{ currentGymId: id \}\)/);

  // 기존 프로 모드 호출부는 인자 없이 부르므로 기구 위저드 흐름이 유지된다.
  assert.match(expert, /if \(action === 'add-gym'\) wtExcAddNewGym\(\);/);
});

test('the day sheet add button keeps a visible failure path', () => {
  const calendar = readProjectFile('render-calendar.js');
  const detailTemplate = readProjectFile('calendar/detail-template.js');

  assert.match(detailTemplate, /data-wt-day-add-session data-date-key/);
  const addSession = sliceFunction(calendar, 'async function _addWorkoutHomeSession', 'async function _openWorkoutHomeRunning');
  assert.match(addSession, /await wtOpenExercisePicker\(\{/);
  assert.match(addSession, /showToast\('종목 추가 화면을 열지 못했어요', 2200, 'error'\)/);
  assert.match(calendar, /Promise\.resolve\(_addWorkoutHomeSession\(key\)\)/);
});

test('a brand-new exercise lands on the day as a card with one set', () => {
  const exercises = readProjectFile('workout/exercises.js');

  const save = sliceFunction(exercises, 'export async function wtSaveExerciseFromEditor', 'export async function wtDeleteExerciseFromEditor');
  assert.match(save, /const isNewExercise = !editingId/);
  assert.match(save, /savedRecord = saved \|\| programRecord/);
  // 새 종목은 선택과 같은 경로를 타야 카드+세트가 함께 생긴다.
  assert.match(save, /if \(isNewExercise && savedRecord\?\.id\) \{[\s\S]*await _selectPickerExercise\(savedRecord\);[\s\S]*return;/);
  // 그 경로에서는 피커를 다시 열지 않는다.
  assert.match(save, /_finishExerciseEditorReturn\(\{ reopenPicker: false \}\)/);
  // 기존 종목 편집은 예전 동작(피커 복귀)을 유지한다.
  assert.match(save, /_finishExerciseEditorReturn\(\);\s*\n\s*showToast\('종목 저장 완료'/);

  const finish = sliceFunction(exercises, 'function _finishExerciseEditorReturn', 'function _workoutScrollTop');
  assert.match(finish, /if \(options\?\.reopenPicker === false\) return;/);
  assert.match(finish, /if \(returnToPicker\) wtOpenExercisePicker\(\);/);

  // 선택 경로는 세트 1개를 가진 엔트리를 만든다.
  const entry = sliceFunction(exercises, 'function _buildPickerExerciseEntry', 'function _currentPickerGymId');
  assert.match(entry, /sets: \[_defaultPickerExerciseSet\(ex\)\]/);

  const select = sliceFunction(exercises, 'async function _selectPickerExercise', 'function _runPickerRowAction');
  assert.match(select, /selectWorkoutExerciseEntry\(S\.workout\.exercises, ex,/);
  assert.match(select, /wtPersistActiveWorkoutDraft\('exercise add'\)/);
  assert.match(select, /saveWorkoutDay\(\{ silent: true, keepDraftExercises: !!afterSelect \}\)/);

  // 편집기를 열 때 피커의 afterSelect가 살아 있어야 시트가 새 카드로 갱신된다.
  const openEditor = sliceFunction(exercises, 'export function wtOpenExerciseEditor', 'export function wtCloseExercisePicker');
  assert.match(openEditor, /getElementById\('ex-picker-modal'\)\?\.classList\.remove\('open'\)/);
  assert.doesNotMatch(openEditor, /wtCloseExercisePicker\(/);
});

test('set actions commit a pending weight before re-reading stored sets', () => {
  const calendar = readProjectFile('render-calendar.js');

  const pending = sliceFunction(calendar, 'function _pendingWorkoutSheetSetInput', 'function _afterPendingWorkoutSheetSetInput');
  assert.match(pending, /_workoutSetKeyboardActiveInput\(\)/);
  assert.match(pending, /data-wt-set-keyboard-dirty="true"/);

  const after = sliceFunction(calendar, 'function _afterPendingWorkoutSheetSetInput', 'function _clearWorkoutSetInputOnFocus');
  assert.match(after, /_commitWorkoutSetKeyboardInput\(input, \{[\s\S]*skipRender: true,/);
  assert.match(after, /\.then\(\(\) => run\(\)\)/);

  const binder = sliceFunction(calendar, 'function _bindWorkoutHomeSheetActions', 'function _pendingWorkoutSheetSetInput');
  // 완료 토글·세트 삭제·카드 액션은 모두 확정 후에 실행된다.
  assert.match(binder, /_afterPendingWorkoutSheetSetInput\(\(\) => _toggleWorkoutExerciseSetDoneFromSheet\(/);
  assert.match(binder, /_afterPendingWorkoutSheetSetInput\(\(\) => _removeWorkoutExerciseSetFromSheet\(/);
  assert.match(binder, /_afterPendingWorkoutSheetSetInput\(\(\) => \{\s*const result = _runWorkoutHomeSheetCardAction\(action, cardAction\);/);
  // 인라인 필드 전환은 자체 커밋 로직을 쓰므로 이중 커밋하지 않는다.
  const editFieldBranch = binder.slice(binder.indexOf("closest?.('[data-wt-set-edit-field]')"), binder.indexOf("closest?.('[data-wt-set-done-toggle]')"));
  assert.doesNotMatch(editFieldBranch, /_afterPendingWorkoutSheetSetInput/);
});
