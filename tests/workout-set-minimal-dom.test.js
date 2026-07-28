import { readAppCssSync } from './helpers/css-source.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { extractFunctionSource } from './helpers/source-function.js';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');
const calendarFormatJs = readFileSync(new URL('../calendar/format.js', import.meta.url), 'utf8');
const calendarDetailTemplateJs = readFileSync(new URL('../calendar/detail-template.js', import.meta.url), 'utf8');
const calendarSheetStateJs = readFileSync(new URL('../calendar/sheet-state.js', import.meta.url), 'utf8');
const calendarSetKeyboardJs = readFileSync(new URL('../calendar/set-keyboard.js', import.meta.url), 'utf8');
const calendarSources = [
  calendarJs,
  calendarFormatJs,
  calendarDetailTemplateJs,
  calendarSheetStateJs,
  calendarSetKeyboardJs,
];
const setPresentationJs = readFileSync(new URL('../workout/set-presentation.js', import.meta.url), 'utf8');
const styleCss = readAppCssSync();
const testArtifactRoot = process.env.TOMATO_TEST_ARTIFACT_DIR
  ? path.resolve(process.env.TOMATO_TEST_ARTIFACT_DIR)
  : path.join(tmpdir(), 'tomatofarm-test-artifacts');
const mobileEvidenceDir = path.join(testArtifactRoot, 'workout-set-mobile-interactions');
const mobileEvidenceJson = path.join(mobileEvidenceDir, 'mobile-set-row-e2e.json');
const mobileEvidenceScreenshot = path.join(mobileEvidenceDir, 'mobile-set-row-after.png');

function extractConstArraySource(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  assert.ok(start >= 0, `${name} should exist`);
  const end = source.indexOf('];', start);
  assert.ok(end > start, `${name} array should end`);
  return source.slice(start, end + 2);
}

function buildHarnessScript() {
  const functionNames = [
    '_workoutSheetInputValue',
    '_workoutSheetRawNumber',
    '_workoutSetEditorKey',
    '_workoutSetInlineFieldKey',
    '_isWorkoutSetEditorExpanded',
    '_isWorkoutSetInlineEditing',
    '_isWorkoutSetTypeMenuOpen',
    '_workoutHomeScrollRoot',
    '_workoutSheetSelectorValue',
    '_positionOpenWorkoutSetTypeMenu',
    '_renderWorkoutSetInput',
    '_renderWorkoutSetInlineInput',
    '_renderWorkoutSetAddRow',
    '_renderWorkoutSetTypeMenu',
    '_renderWorkoutSetRows',
    '_workoutPreviousSetSummary',
    '_workoutCardGoal',
    '_renderWorkoutExerciseDetailCard',
    '_clearWorkoutSetEditorsForExercise',
    '_runWorkoutHomeSheetCardAction',
    '_workoutDayExportMenuParts',
    '_toggleWorkoutDayExportMenu',
    '_closeWorkoutDayExportMenu',
    '_pendingWorkoutSheetSetInput',
    '_afterPendingWorkoutSheetSetInput',
    '_clearWorkoutSetInputOnFocus',
    '_workoutSetKeyboardElement',
    '_workoutSetKeyboardSheet',
    '_workoutSetKeyboardActiveInput',
    '_workoutSetKeyboardMeta',
    '_sameWorkoutSetKeyboardTarget',
    '_workoutSetKeyboardInlineTargets',
    '_findWorkoutSetKeyboardMoveTarget',
    '_focusWorkoutSetKeyboardTarget',
    '_workoutSetKeyboardRenderedInput',
    '_focusWorkoutSetKeyboardRenderedTarget',
    '_syncWorkoutSetKeyboardButtons',
    '_ensureWorkoutSetKeyboard',
    '_showWorkoutSetKeyboard',
    '_clearWorkoutSetKeyboardSurface',
    '_hideWorkoutSetKeyboard',
    '_markWorkoutSetKeyboardInputDirty',
    '_replaceWorkoutSetKeyboardInputValue',
    '_workoutSetKeyboardCursor',
    '_applyWorkoutSetKeyboardKey',
    '_applyWorkoutSetKeyboardBackspace',
    '_applyWorkoutSetKeyboardClear',
    '_commitWorkoutSetKeyboardInput',
    '_commitWorkoutSetKeyboardDone',
    '_completeWorkoutSetKeyboardInput',
    '_moveWorkoutSetKeyboardFocus',
    '_bindWorkoutSetSwipeDelete',
    '_bindWorkoutHomeSheetActions',
    '_focusWorkoutSetInlineFieldFromSheet',
    '_cancelWorkoutSetInlineFieldFromSheet',
    '_focusWorkoutSetEditorFieldFromSheet',
    '_toggleWorkoutSetEditorFromSheet',
    '_toggleWorkoutSetTypeMenuFromSheet',
    '_setWorkoutSheetNumber',
    '_updateWorkoutExerciseSetFromSheet',
    '_setWorkoutExerciseSetTypeFromSheet',
    '_removeWorkoutExerciseSetFromSheet',
    '_copyPreviousWorkoutSetForSheet',
    '_copyPreviousWorkoutRecordSetsForSheet',
    '_copyPreviousWorkoutExerciseSetsFromSheet',
    '_renderWorkoutExerciseSlides',
    '_patchWorkoutSheetSetSurfaces',
    '_renderWorkoutSheetAfterSetEdit',
  ];
  const sourceBundle = [
    setPresentationJs.replace(/^export /gmu, ''),
    extractConstArraySource(calendarDetailTemplateJs, 'WORKOUT_SET_TYPE_OPTIONS'),
    ...functionNames.map(name => extractFunctionSource(calendarSources, name)),
  ].join('\n\n');

  return `
    const WORKOUT_GYM_SESSION_COUNT = 2;
    const WORKOUT_SHEET_SET_INPUT_SELECTOR = '[data-wt-set-input]';
    let _workoutHomeSelectedKey = '2026-07-04';
    let _workoutHomeSessionIndex = 0;
    let _workoutHomeSheetState = 'bar';
    const _workoutOpenSetTypeMenus = new Set();
    const _workoutExpandedSetEditors = new Set();
    const workoutDetailState = { editingCardId: null, inlineSetEditor: null };
    const workoutSetKeyboardState = { input: null, domLocked: false };
    const workoutSetKeyboardRuntime = {
      cancelInlineField: (...args) => _cancelWorkoutSetInlineFieldFromSheet(...args),
      getSelectedKey: () => _workoutHomeSelectedKey,
      clearInputOnFocus: input => _clearWorkoutSetInputOnFocus(input),
      defaultSet: (...args) => _defaultWorkoutSheetSet(...args),
      focusEditorField: (...args) => _focusWorkoutSetEditorFieldFromSheet(...args),
      focusInlineField: (...args) => _focusWorkoutSetInlineFieldFromSheet(...args),
      mutateExercise: (...args) => _mutateWorkoutExerciseFromSheet(...args),
      removeExerciseSet: (...args) => _removeWorkoutExerciseSetFromSheet(...args),
      setWorkoutSheetNumber: (...args) => _setWorkoutSheetNumber(...args),
      syncNavState: (...args) => _syncWorkoutHomeNavState(...args),
      updateExerciseSet: (...args) => _updateWorkoutExerciseSetFromSheet(...args),
    };
    window.__renderCalls = 0;
    window.__syncCalls = [];
    window.__restoreCalls = [];
    window.__mutateCalls = [];
    window.__deferSetMutationRender = false;
    window.__mutationDelayMs = 0;
    window.__pendingMutationRender = null;
    window.__scrollerTouchMoveBlocks = 0;
    window.__doneToggleCalls = [];

    function _esc(value = '') {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]);
    }
    function _num(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    function _fmtNum(value, digits = 1) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '';
      return n.toFixed(digits).replace(/\\.0+$/u, '').replace(/(\\.\\d*?)0+$/u, '$1');
    }
    function _isBlankWorkoutSheetNumber(value) {
      return value == null || String(value).trim() === '';
    }
    function _parseDateKey(key) {
      return /^\\d{4}-\\d{2}-\\d{2}$/u.test(String(key || ''));
    }
    function _captureWorkoutSheetScrollState() {
      return { top: 12 };
    }
    function _restoreWorkoutSheetScrollState(state) {
      window.__restoreCalls.push(state);
    }
    function _syncWorkoutHomeNavState(payload) {
      window.__syncCalls.push(payload);
    }
    function _toggleWorkoutHomeSheet() {}
    function _openWorkoutHomeRunning() { return false; }
    function _addWorkoutHomeSession() { return false; }
    // 완료 토글은 저장된 세트를 다시 읽는다. 호출 시점의 세트 값을 기록해 두면
    // 입력 확정이 토글보다 먼저 일어났는지 검증할 수 있다.
    function _toggleWorkoutExerciseSetDoneFromSheet(targetKey, targetSessionIndex, exerciseIndex, setIndex) {
      const index = Math.max(0, Math.floor(Number(setIndex) || 0));
      const set = (window.__entry.sets || [])[index] || {};
      window.__doneToggleCalls.push({ setIndex: index, kg: set.kg, reps: set.reps, done: set.done === true });
      return false;
    }
    function _completeWorkoutExerciseFromSheet() { return false; }
    function _editWorkoutExerciseCard() { return false; }
    function _toggleWorkoutDetailCard() { return false; }
    function _deleteWorkoutExercise() { return false; }
    function _deleteWorkoutActivity() { return false; }
    function _exportWorkoutRecords() { return false; }
    function _isWorkoutExerciseCompletionStamped() { return false; }
    function _renderWorkoutTrackGraph() { return ''; }
    function activeWorkoutTrack() { return 'M'; }
    function workoutTrackLabel() { return '중량'; }
    function _previousWorkoutRecordForRow() { return window.__previousRecord || null; }
    function _workoutEntryName(entry = {}) { return String(entry?.name || entry?.exerciseId || ''); }
    function getCache() { return window.__cache || {}; }
    function getDietPlan() { return null; }
    function _sortedCheckins() { return []; }
    function _renderWorkoutDetailSummaryCard() { return '<div class="wt-day-summary-card"></div>'; }
    function _mountWorkoutSummaryElapsedTimers() {}
    // 부분 갱신은 시트 모델을 다시 읽어 카드만 갈아끼운다. 하네스는 종목 하나만
    // 세우므로 같은 모양의 모델을 돌려준다.
    function _workoutHomeDetailModel() {
      return { sessionIndex: 0, wx: { exercises: [_rowFromEntry()] } };
    }
    function _defaultWorkoutSheetSet(prev = {}) {
      return { kg: prev.kg ?? '', reps: prev.reps ?? '', setType: prev.setType || 'main', done: false };
    }
    function clearWorkoutExerciseCompletionMarker(entry) {
      delete entry.exerciseCompletedAt;
      window.__completionMarkerCleared = true;
    }

    ${sourceBundle}

    window.__entry = { name: '벤치프레스', exerciseId: 'bench-press', sets: [] };
    window.__previousRecord = null;
    function _rowFromEntry() {
      const rawSetDetails = (window.__entry.sets || []).map((set, index) => ({ ...set, setIndex: index }));
      return {
        name: window.__entry.name || '벤치프레스',
        exerciseId: window.__entry.exerciseId || 'bench-press',
        originalIndex: 0,
        dateKey: '2026-07-04',
        setCount: rawSetDetails.length,
        setDetails: rawSetDetails,
        rawSetDetails,
        previousRecord: window.__previousRecord,
        // 실제 읽기 모델(workout-read-model.js)도 처방을 행에 실어 준다.
        maxPrescription: window.__entry.maxPrescription || null,
      };
    }
    function renderWorkoutCalendarHome() {
      if (workoutSetKeyboardState.domLocked && _workoutSetKeyboardElement()?.classList.contains('is-open')) return;
      window.__renderCalls += 1;
      document.body.innerHTML = '<main id="workout-calendar-root"><section data-wt-day-sheet><div class="wt-day-sheet-scroll"><div data-wt-day-exercise-carousel-track>'
        + _renderWorkoutExerciseDetailCard('2026-07-04', 0, _rowFromEntry(), 0)
        + '</div></div></section></main>';
      _bindWorkoutHomeSheetActions(document.getElementById('workout-calendar-root'));
      document.querySelector('.wt-day-sheet-scroll')?.addEventListener('touchmove', (event) => {
        window.__scrollerTouchMoveBlocks += 1;
        event.stopPropagation();
      }, { passive: false });
    }
    async function _mutateWorkoutExerciseFromSheet(targetKey, targetSessionIndex, exerciseIndex, mutator, options = {}) {
      const ok = mutator(window.__entry);
      window.__mutateCalls.push({ targetKey, targetSessionIndex, exerciseIndex, options });
      if (options?.skipRender !== true && (options?.optimisticRender || !window.__deferSetMutationRender)) {
        // 실제 저장 경로(_saveWorkoutHomeSessionResult)와 같이 부분 갱신을 먼저 쓴다.
        if (options?.optimisticRender) _renderWorkoutSheetAfterSetEdit();
        else renderWorkoutCalendarHome();
      } else {
        window.__pendingMutationRender = { targetKey, targetSessionIndex, exerciseIndex, options };
      }
      if (window.__mutationDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, window.__mutationDelayMs));
      }
      return ok;
    }
    window._wtCalUpdateExerciseSet = _updateWorkoutExerciseSetFromSheet;
    window.__copyPreviousWorkoutRecordSets = _copyPreviousWorkoutRecordSetsForSheet;
    window.showToast = (message, duration, type) => {
      window.__lastToast = { message, duration, type };
    };
    window.renderWorkoutCalendarHome = renderWorkoutCalendarHome;
    window.__harnessReady = true;
  `;
}

async function runHarnessPage(fn) {
  const harnessScript = buildHarnessScript();
  assert.doesNotThrow(() => new Function(harnessScript));
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
    await page.setContent('<!doctype html><html lang="ko"><body></body></html>');
    await page.addStyleTag({ content: styleCss });
    await page.addScriptTag({ content: harnessScript });
    const ready = await page.evaluate(() => window.__harnessReady === true);
    assert.deepEqual(pageErrors, []);
    assert.equal(ready, true);
    const result = await fn(page);
    assert.deepEqual(pageErrors, []);
    return result;
  } finally {
    await browser.close();
  }
}

async function runHarness(fn) {
  return runHarnessPage(page => page.evaluate(fn));
}

test('minimal set row opens right editor and left M/W/D/F menu in a browser DOM', async () => {
  const result = await runHarness(async () => {
    window.__entry = { sets: [{ kg: 40, reps: 10, rir: 2, romPct: 85, setType: 'main', done: false }] };
    window.renderWorkoutCalendarHome();
    const collapsed = {
      inputCount: document.querySelectorAll('[data-wt-set-input]').length,
      hasEditor: !!document.querySelector('.wt-max-set-editor'),
      typeText: document.querySelector('.wt-max-set-type-btn')?.textContent?.replace(/\s+/g, ' ').trim(),
      valueText: Array.from(document.querySelectorAll('.wt-max-set-value')).map(node => node.textContent.replace(/\s+/g, ' ').trim()),
      hasRirText: document.body.textContent.includes('RIR'),
      hasRomText: document.body.textContent.includes('ROM'),
    };

    document.querySelector('.wt-max-set-expand').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const expanded = {
      fields: Array.from(document.querySelectorAll('[data-wt-set-input]')).map(input => input.dataset.field),
      editorOpen: !!document.querySelector('.wt-max-set-editor'),
      expandAria: document.querySelector('.wt-max-set-expand')?.getAttribute('aria-expanded'),
    };

    document.querySelector('.wt-max-set-type-btn').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const menu = {
      editorOpen: !!document.querySelector('.wt-max-set-editor'),
      optionCodes: Array.from(document.querySelectorAll('[data-wt-set-type-option] b')).map(node => node.textContent.trim()),
      optionTypes: Array.from(document.querySelectorAll('[data-wt-set-type-option]')).map(node => node.dataset.setType),
      typeAria: document.querySelector('.wt-max-set-type-btn')?.getAttribute('aria-expanded'),
    };
    return { collapsed, expanded, menu, renderCalls: window.__renderCalls, syncCalls: window.__syncCalls };
  });

  assert.equal(result.collapsed.inputCount, 0);
  assert.equal(result.collapsed.hasEditor, false);
  assert.equal(result.collapsed.typeText, '1메인');
  assert.deepEqual(result.collapsed.valueText, ['40kg', '10회']);
  assert.equal(result.collapsed.hasRirText, false);
  assert.equal(result.collapsed.hasRomText, false);
  assert.deepEqual(result.expanded.fields, ['kg', 'reps', 'rir', 'romPct']);
  assert.equal(result.expanded.editorOpen, true);
  assert.equal(result.expanded.expandAria, 'true');
  assert.equal(result.menu.editorOpen, false);
  assert.deepEqual(result.menu.optionCodes, ['M', 'W', 'D', 'F']);
  assert.deepEqual(result.menu.optionTypes, ['main', 'warmup', 'drop', 'failure']);
  assert.equal(result.menu.typeAria, 'true');
  assert.ok(result.renderCalls >= 3);
  assert.deepEqual(result.syncCalls.map(call => call.action), ['sheet:set-editor', 'sheet:set-type']);
});

test('mobile set row exposes editable kg/reps values and swipe delete targets in a browser DOM', async () => {
  const result = await runHarness(() => {
    window.__entry = {
      sets: [
        { kg: 70, reps: 10, rir: 2, romPct: 100, setType: 'main', done: false },
        { kg: 40, reps: 12, rir: 2, romPct: 100, setType: 'main', done: false },
      ],
    };
    window.renderWorkoutCalendarHome();
    const editFields = Array.from(document.querySelectorAll('[data-wt-set-edit-field]')).map(node => node.dataset.wtSetEditField);
    const swipeRows = Array.from(document.querySelectorAll('[data-wt-set-swipe-row]')).map(node => node.dataset.setIndex);
    const remove = document.querySelector('.wt-max-set-remove-btn');
    const expand = document.querySelector('.wt-max-set-expand');
    const row = document.querySelector('.wt-max-set-row');
    const check = document.querySelector('.wt-max-set-check');
    return {
      editFields,
      swipeRows,
      firstKgText: document.querySelector('[data-wt-set-edit-field="kg"]')?.textContent?.replace(/\s+/g, '').trim() || '',
      firstRepsText: document.querySelector('[data-wt-set-edit-field="reps"]')?.textContent?.replace(/\s+/g, '').trim() || '',
      removeAction: remove?.getAttribute('data-wt-set-remove') ?? null,
      removeLabel: remove?.getAttribute('aria-label') ?? '',
      removeBeforeExpand: !!(remove && expand && remove.compareDocumentPosition(expand) & Node.DOCUMENT_POSITION_FOLLOWING),
      rowHeight: row?.getBoundingClientRect().height ?? 0,
      controlHeight: check?.getBoundingClientRect().height ?? 0,
    };
  });

  assert.deepEqual(result.editFields, ['kg', 'reps', 'kg', 'reps']);
  assert.deepEqual(result.swipeRows, ['0', '1']);
  assert.equal(result.firstKgText, '70kg');
  assert.equal(result.firstRepsText, '10회');
  assert.equal(result.removeAction, '');
  assert.match(result.removeLabel, /세트 삭제/);
  assert.equal(result.removeBeforeExpand, true);
  assert.equal(result.rowHeight, 38);
  assert.equal(result.controlHeight, 32);
  assert.ok(Math.abs((result.rowHeight / 54) - 0.7) < 0.01);
});

test('mobile set row inline editing clears values and only right-to-left swipe removes sets', async () => {
  const result = await runHarnessPage(async (page) => {
    await page.evaluate(() => {
      window.__entry = {
        sets: [
          { kg: 70, reps: 10, rir: 2, romPct: 100, setType: 'main', done: false },
          { kg: 40, reps: 12, rir: 2, romPct: 100, setType: 'main', done: false },
          { kg: 35, reps: 14, rir: 2, romPct: 100, setType: 'main', done: false },
        ],
      };
      window.__syncCalls = [];
      window.__restoreCalls = [];
      window.renderWorkoutCalendarHome();
    });

    async function tapSelector(selector) {
      const handle = await page.waitForSelector(selector, { visible: true });
      const box = await handle.boundingBox();
      assert.ok(box, `${selector} should have a bounding box`);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    await tapSelector('[data-wt-set-edit-field="kg"][data-set-index="0"]');
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]'));
    const kgFocus = await page.evaluate(() => ({
      field: document.activeElement?.getAttribute('data-field') || '',
      value: document.activeElement?.value ?? null,
      editorOpen: !!document.querySelector('.wt-max-set-editor'),
      inlineEditing: !!document.querySelector('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]'),
    }));
    await page.$eval('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]', input => {
      input.value = '55';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForFunction(() => window.__entry.sets[0]?.kg === 55);

    await tapSelector('[data-wt-set-edit-field="reps"][data-set-index="0"]');
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="reps"][data-set-index="0"]'));
    const repsFocus = await page.evaluate(() => ({
      field: document.activeElement?.getAttribute('data-field') || '',
      value: document.activeElement?.value ?? null,
      editorOpen: !!document.querySelector('.wt-max-set-editor'),
      inlineEditing: !!document.querySelector('[data-wt-set-inline-input][data-field="reps"][data-set-index="0"]'),
    }));
    await page.$eval('[data-wt-set-inline-input][data-field="reps"][data-set-index="0"]', input => {
      input.value = '15';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForFunction(() => window.__entry.sets[0]?.reps === 15);

    const hitTargets = await page.evaluate(() => {
      const check = document.querySelector('.wt-max-set-check');
      const type = document.querySelector('.wt-max-set-type-btn');
      const remove = document.querySelector('.wt-max-set-remove-btn');
      const expand = document.querySelector('.wt-max-set-expand');
      const checkRect = check.getBoundingClientRect();
      const typeRect = type.getBoundingClientRect();
      const removeRect = remove.getBoundingClientRect();
      const expandRect = expand.getBoundingClientRect();
      return {
        checkWidth: checkRect.width,
        checkHeight: checkRect.height,
        typeWidth: typeRect.width,
        typeHeight: typeRect.height,
        removeWidth: removeRect.width,
        removeHeight: removeRect.height,
        removeCenterX: removeRect.left + removeRect.width / 2,
        expandCenterX: expandRect.left + expandRect.width / 2,
        gap: expandRect.left - removeRect.right,
      };
    });

    async function swipeElement(selector, deltaX) {
      const target = await page.waitForSelector(selector, { visible: true });
      const rowBox = await target.boundingBox();
      assert.ok(rowBox, `${selector} should have a bounding box`);
      const client = await page.target().createCDPSession();
      const startX = rowBox.x + rowBox.width / 2;
      const startY = rowBox.y + rowBox.height / 2;
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: startX, y: startY }],
      });
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: startX + deltaX, y: startY + 3 }],
      });
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await client.detach();
    }

    await page.evaluate(() => { window.__deferSetMutationRender = true; });
    await swipeElement('[data-wt-set-edit-field="kg"][data-set-index="2"]', 74);
    await new Promise(resolve => setTimeout(resolve, 80));
    const afterRightSwipe = await page.evaluate(() => {
      const row = document.querySelector('[data-wt-set-swipe-row][data-set-index="2"]');
      return {
        rows: document.querySelectorAll('[data-wt-set-swipe-row]').length,
        sets: window.__entry.sets.length,
        transform: row?.style.transform || '',
        swiping: row?.classList.contains('is-swiping') || false,
      };
    });
    assert.deepEqual(afterRightSwipe, { rows: 3, sets: 3, transform: '', swiping: false });

    await swipeElement('[data-wt-set-edit-field="reps"][data-set-index="1"]', -74);
    await page.waitForFunction(() => (
      window.__entry.sets.length === 2
      && document.querySelectorAll('[data-wt-set-swipe-row]').length === 2
    ), { timeout: 1500 });

    const finalState = await page.evaluate(() => ({
      sets: window.__entry.sets,
      rows: document.querySelectorAll('[data-wt-set-swipe-row]').length,
      values: Array.from(document.querySelectorAll('.wt-max-set-value')).map(node => node.textContent.replace(/\s+/g, '').trim()),
      syncActions: window.__syncCalls.map(call => call.action),
      mutationOptions: window.__mutateCalls.map(call => call.options),
      pendingMutationRender: window.__pendingMutationRender,
      restoreCount: window.__restoreCalls.length,
      toast: window.__lastToast,
    }));

    mkdirSync(mobileEvidenceDir, { recursive: true });
    writeFileSync(mobileEvidenceJson, JSON.stringify({ kgFocus, repsFocus, hitTargets, finalState }, null, 2), 'utf8');
    await page.screenshot({ path: mobileEvidenceScreenshot, fullPage: true });

    return { kgFocus, repsFocus, hitTargets, finalState };
  });

  assert.deepEqual(result.kgFocus, { field: 'kg', value: '', editorOpen: false, inlineEditing: true });
  assert.deepEqual(result.repsFocus, { field: 'reps', value: '', editorOpen: false, inlineEditing: true });
  assert.equal(result.hitTargets.checkWidth, 32);
  assert.equal(result.hitTargets.checkHeight, 32);
  assert.equal(result.hitTargets.typeWidth, 32);
  assert.equal(result.hitTargets.typeHeight, 32);
  assert.equal(result.hitTargets.removeWidth, 32);
  assert.equal(result.hitTargets.removeHeight, 32);
  assert.ok(result.hitTargets.removeCenterX < result.hitTargets.expandCenterX);
  assert.ok(result.hitTargets.gap >= 3);
  assert.deepEqual(result.finalState.sets, [
    { kg: 55, reps: 15, rir: 2, romPct: 100, setType: 'main', done: false },
    { kg: 35, reps: 14, rir: 2, romPct: 100, setType: 'main', done: false },
  ]);
  assert.equal(result.finalState.rows, 2);
  assert.deepEqual(result.finalState.values, ['55kg', '15회', '35kg', '14회']);
  assert.ok(result.finalState.syncActions.includes('sheet:set-inline-field'));
  assert.equal(result.finalState.mutationOptions.filter(options => options.optimisticRender === true).length, 1);
  assert.equal(result.finalState.pendingMutationRender, null);
  assert.equal(result.finalState.toast?.message, '세트를 삭제했어요');
});

test('mobile inline field switching commits a dirty keypad value without rerendering the row', async () => {
  const result = await runHarnessPage(async (page) => {
    await page.evaluate(() => {
      window.__entry = {
        sets: [{ kg: 70, reps: 10, rir: 2, romPct: 100, setType: 'main', done: false }],
      };
      window.__mutateCalls = [];
      window.renderWorkoutCalendarHome();
    });

    async function tapSelector(selector) {
      const handle = await page.waitForSelector(selector, { visible: true });
      const box = await handle.boundingBox();
      assert.ok(box, `${selector} should have a bounding box`);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    await tapSelector('[data-wt-set-edit-field="kg"][data-set-index="0"]');
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]'));
    await page.$eval('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]', (input) => {
      input.value = '55';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const beforeSwitch = await page.evaluate(() => {
      window.__fieldSwitchRow = document.querySelector('[data-wt-set-swipe-row][data-set-index="0"]');
      window.__fieldSwitchKeyboard = document.querySelector('[data-wt-set-keyboard]');
      return {
        inputValue: document.activeElement?.value ?? null,
        storedKg: window.__entry.sets[0]?.kg ?? null,
        dirty: document.activeElement?.getAttribute('data-wt-set-keyboard-dirty') || '',
        inlineFields: Array.from(document.querySelectorAll('[data-wt-set-inline-input][data-set-index="0"]'))
          .map(input => input.getAttribute('data-field')),
        renderCalls: window.__renderCalls,
      };
    });

    await tapSelector('[data-wt-set-inline-input][data-field="reps"][data-set-index="0"]');
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="reps"][data-set-index="0"]'));
    const afterSwitch = await page.evaluate(() => ({
      activeField: document.activeElement?.getAttribute('data-field') || '',
      activeValue: document.activeElement?.value ?? null,
      sets: window.__entry.sets,
      renderCalls: window.__renderCalls,
      sameRow: window.__fieldSwitchRow === document.querySelector('[data-wt-set-swipe-row][data-set-index="0"]'),
      sameKeyboard: window.__fieldSwitchKeyboard === document.querySelector('[data-wt-set-keyboard]'),
      mutationOptions: window.__mutateCalls.map(call => call.options),
    }));

    await page.$eval('[data-wt-set-inline-input][data-field="reps"][data-set-index="0"]', (input) => {
      input.value = '12';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await tapSelector('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]');
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]'));
    const afterReturn = await page.evaluate(() => ({
      activeField: document.activeElement?.getAttribute('data-field') || '',
      activeValue: document.activeElement?.value ?? null,
      sets: window.__entry.sets,
      renderCalls: window.__renderCalls,
      sameRow: window.__fieldSwitchRow === document.querySelector('[data-wt-set-swipe-row][data-set-index="0"]'),
      sameKeyboard: window.__fieldSwitchKeyboard === document.querySelector('[data-wt-set-keyboard]'),
      keyboardOpen: !!document.querySelector('[data-wt-set-keyboard].is-open'),
      mutationOptions: window.__mutateCalls.map(call => call.options),
    }));

    return { beforeSwitch, afterSwitch, afterReturn };
  });

  assert.deepEqual(result.beforeSwitch.inlineFields, ['kg', 'reps']);
  assert.equal(result.beforeSwitch.inputValue, '55');
  assert.equal(result.beforeSwitch.storedKg, 70);
  assert.equal(result.beforeSwitch.dirty, 'true');
  assert.equal(result.afterSwitch.activeField, 'reps');
  assert.equal(result.afterSwitch.activeValue, '');
  assert.equal(result.afterSwitch.sets[0].kg, 55);
  assert.equal(result.afterSwitch.sets[0].reps, 10);
  assert.equal(result.afterSwitch.renderCalls, result.beforeSwitch.renderCalls);
  assert.equal(result.afterSwitch.sameRow, true);
  assert.equal(result.afterSwitch.sameKeyboard, true);
  assert.equal(result.afterSwitch.mutationOptions.length, 1);
  assert.equal(result.afterSwitch.mutationOptions[0].optimisticRender, true);
  assert.equal(result.afterSwitch.mutationOptions[0].skipRender, true);
  assert.equal(result.afterReturn.activeField, 'kg');
  assert.equal(result.afterReturn.activeValue, '55');
  assert.equal(result.afterReturn.sets[0].kg, 55);
  assert.equal(result.afterReturn.sets[0].reps, 12);
  assert.equal(result.afterReturn.renderCalls, result.beforeSwitch.renderCalls);
  assert.equal(result.afterReturn.sameRow, true);
  assert.equal(result.afterReturn.sameKeyboard, true);
  assert.equal(result.afterReturn.keyboardOpen, true);
  assert.equal(result.afterReturn.mutationOptions.length, 2);
  assert.ok(result.afterReturn.mutationOptions.every(options => (
    options.optimisticRender === true && options.skipRender === true
  )));
});

test('custom workout set keypad enters values and moves left or right across inline fields', async () => {
  const result = await runHarnessPage(async (page) => {
    await page.evaluate(() => {
      window.__entry = {
        sets: [
          { kg: 70, reps: 10, rir: 2, romPct: 100, setType: 'main', done: false },
          { kg: 40, reps: 12, rir: 2, romPct: 100, setType: 'main', done: false },
        ],
      };
      window.__syncCalls = [];
      window.__mutateCalls = [];
      window.__mutationDelayMs = 600;
      window.renderWorkoutCalendarHome();
    });

    async function tapSelector(selector) {
      const handle = await page.waitForSelector(selector, { visible: true });
      const box = await handle.boundingBox();
      assert.ok(box, `${selector} should have a bounding box`);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    await tapSelector('[data-wt-set-edit-field="kg"][data-set-index="0"]');
    await page.waitForFunction(() => document.querySelector('[data-wt-set-keyboard].is-open'));
    await new Promise(resolve => setTimeout(resolve, 220));
    const shown = await page.evaluate(() => {
      const input = document.activeElement;
      return {
        field: input?.getAttribute('data-field') || '',
        value: input?.value ?? null,
        readOnly: input?.readOnly === true,
        inputMode: input?.getAttribute('inputmode') || '',
        keyCount: document.querySelectorAll('[data-wt-set-keyboard-key]').length,
        hasPrev: !!document.querySelector('[data-wt-set-keyboard-action="prev"]'),
        hasNext: !!document.querySelector('[data-wt-set-keyboard-action="next"]'),
        sheetPadded: document.querySelector('[data-wt-day-sheet]')?.classList.contains('has-set-keyboard') || false,
      };
    });

    await tapSelector('[data-wt-set-keyboard-key="8"]');
    await tapSelector('[data-wt-set-keyboard-key="0"]');
    const typedKg = await page.evaluate(() => ({
      value: document.activeElement?.value ?? null,
      dirty: document.activeElement?.getAttribute('data-wt-set-keyboard-dirty') || '',
      storedKg: window.__entry.sets[0]?.kg ?? null,
      mutationCount: window.__mutateCalls.length,
    }));

    const renderBeforeNext = await page.evaluate(() => {
      window.__nextMoveRow = document.querySelector('[data-wt-set-swipe-row][data-set-index="0"]');
      window.__nextMoveKeyboard = document.querySelector('[data-wt-set-keyboard]');
      return window.__renderCalls;
    });
    const nextStartedAt = Date.now();
    await tapSelector('[data-wt-set-keyboard-action="next"]');
    await page.waitForFunction(() => (
      window.__entry.sets[0]?.kg === 80
      && document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="reps"][data-set-index="0"]')
    ), { timeout: 1500 });
    const afterNextMove = await page.evaluate((before) => ({
      renderDelta: window.__renderCalls - before,
      activeField: document.activeElement?.getAttribute('data-field') || '',
      keyboardOpen: !!document.querySelector('[data-wt-set-keyboard].is-open'),
      sameRow: window.__nextMoveRow === document.querySelector('[data-wt-set-swipe-row][data-set-index="0"]'),
      sameKeyboard: window.__nextMoveKeyboard === document.querySelector('[data-wt-set-keyboard]'),
    }), renderBeforeNext);
    afterNextMove.elapsedMs = Date.now() - nextStartedAt;

    await tapSelector('[data-wt-set-keyboard-key="1"]');
    await tapSelector('[data-wt-set-keyboard-key="5"]');
    const renderBeforePrev = await page.evaluate(() => {
      window.__prevMoveRow = document.querySelector('[data-wt-set-swipe-row][data-set-index="0"]');
      window.__prevMoveKeyboard = document.querySelector('[data-wt-set-keyboard]');
      return window.__renderCalls;
    });
    const prevStartedAt = Date.now();
    await tapSelector('[data-wt-set-keyboard-action="prev"]');
    await page.waitForFunction(() => (
      window.__entry.sets[0]?.reps === 15
      && document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]')
    ));
    const afterPrevMove = await page.evaluate((before) => ({
      renderDelta: window.__renderCalls - before,
      activeField: document.activeElement?.getAttribute('data-field') || '',
      keyboardOpen: !!document.querySelector('[data-wt-set-keyboard].is-open'),
      sameRow: window.__prevMoveRow === document.querySelector('[data-wt-set-swipe-row][data-set-index="0"]'),
      sameKeyboard: window.__prevMoveKeyboard === document.querySelector('[data-wt-set-keyboard]'),
    }), renderBeforePrev);
    afterPrevMove.elapsedMs = Date.now() - prevStartedAt;

    const afterPrev = await page.evaluate(() => ({
      activeField: document.activeElement?.getAttribute('data-field') || '',
      activeValue: document.activeElement?.value ?? null,
      sets: window.__entry.sets,
      keyboardOpen: !!document.querySelector('[data-wt-set-keyboard].is-open'),
      syncActions: window.__syncCalls.map(call => call.action),
      mutationOptions: window.__mutateCalls.map(call => call.options),
    }));

    const doneStartedAt = Date.now();
    await tapSelector('[data-wt-set-keyboard-action="done"]');
    await page.waitForFunction(() => (
      !document.querySelector('[data-wt-set-keyboard]')
      && !document.querySelector('[data-wt-set-inline-input]')
    ));

    const hidden = await page.evaluate(() => ({
      sets: window.__entry.sets,
      firstCompletedAtIsNumber: Number.isFinite(Number(window.__entry.sets[0]?.completedAt)),
      keyboardOpenClass: document.documentElement.classList.contains('wt-set-keyboard-open'),
      sheetPadded: document.querySelector('[data-wt-day-sheet]')?.classList.contains('has-set-keyboard') || false,
    }));
    hidden.elapsedMs = Date.now() - doneStartedAt;

    return { shown, typedKg, afterNextMove, afterPrevMove, afterPrev, hidden };
  });

  assert.deepEqual(result.shown, {
    field: 'kg',
    value: '',
    readOnly: true,
    inputMode: 'none',
    keyCount: 11,
    hasPrev: true,
    hasNext: true,
    sheetPadded: true,
  });
  assert.deepEqual(result.typedKg, { value: '80', dirty: 'true', storedKg: 70, mutationCount: 0 });
  assert.deepEqual(
    { ...result.afterNextMove, elapsedMs: undefined },
    {
      renderDelta: 0,
      activeField: 'reps',
      keyboardOpen: true,
      sameRow: true,
      sameKeyboard: true,
      elapsedMs: undefined,
    },
  );
  assert.ok(result.afterNextMove.elapsedMs < 250, `next field took ${result.afterNextMove.elapsedMs}ms`);
  assert.deepEqual(
    { ...result.afterPrevMove, elapsedMs: undefined },
    {
      renderDelta: 0,
      activeField: 'kg',
      keyboardOpen: true,
      sameRow: true,
      sameKeyboard: true,
      elapsedMs: undefined,
    },
  );
  assert.ok(result.afterPrevMove.elapsedMs < 250, `previous field took ${result.afterPrevMove.elapsedMs}ms`);
  assert.equal(result.afterPrev.activeField, 'kg');
  assert.equal(result.afterPrev.activeValue, '80');
  assert.deepEqual(result.afterPrev.sets[0], { kg: 80, reps: 15, rir: 2, romPct: 100, setType: 'main', done: false });
  assert.equal(result.afterPrev.keyboardOpen, true);
  assert.ok(result.afterPrev.syncActions.filter(action => action === 'sheet:set-inline-field').length >= 3);
  assert.ok(result.afterPrev.mutationOptions.every(options => (
    options.preserveSheetScroll === true
    && options.optimisticRender === true
    && options.skipRender === true
  )));
  assert.equal(result.hidden.sets[0].kg, 80);
  assert.equal(result.hidden.sets[0].reps, 15);
  assert.equal(result.hidden.sets[0].done, true);
  assert.equal(result.hidden.firstCompletedAtIsNumber, true);
  assert.deepEqual(result.hidden.sets[1], { kg: 40, reps: 12, rir: 2, romPct: 100, setType: 'main', done: false });
  assert.equal(result.hidden.keyboardOpenClass, false);
  assert.equal(result.hidden.sheetPadded, false);
  assert.ok(result.hidden.elapsedMs < 250, `done button took ${result.hidden.elapsedMs}ms`);
});

test('previous workout card copies every set value but resets completion state', async () => {
  const result = await runHarness(async () => {
    window.__entry = {
      name: '벤치프레스',
      exerciseId: 'bench-press',
      exerciseCompletedAt: 999,
      sets: [{ kg: 20, reps: 5, done: false }],
    };
    window.__previousRecord = {
      dateLabel: '3일 전',
      setDetails: [
      {
        kg: 60,
        reps: 10,
        rpe: 8,
        rir: 2,
        romPct: 90,
        setType: 'main',
        completedAt: 111,
        done: true,
      },
      {
        kg: 50,
        reps: 12,
        rpe: 9,
        rir: 1,
        romPct: 100,
        setType: 'drop',
        wendlerRole: 'backoff',
        supplementalKind: 'bbb',
        wendlerPct: 65,
        amrap: true,
        completedAt: 222,
        done: true,
      },
    ],
    };
    window.renderWorkoutCalendarHome();
    const copyCard = document.querySelector('[data-wt-sheet-card-action="copy-previous-sets"]');
    copyCard?.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    return {
      copiedSets: window.__entry.sets,
      completionMarkerCleared: !('exerciseCompletedAt' in window.__entry),
      toast: window.__lastToast,
    };
  });

  assert.deepEqual(result.copiedSets, [
    {
      kg: 60,
      reps: 10,
      rpe: 8,
      rir: 2,
      romPct: 90,
      setType: 'main',
      done: false,
    },
    {
      kg: 50,
      reps: 12,
      rpe: 9,
      rir: 1,
      romPct: 100,
      setType: 'drop',
      wendlerRole: 'backoff',
      supplementalKind: 'bbb',
      wendlerPct: 65,
      amrap: true,
      done: false,
    },
  ]);
  assert.equal(result.completionMarkerCleared, true);
  assert.deepEqual(result.toast, {
    message: '지난 기록 2세트를 가져왔어요',
    duration: 1400,
    type: 'success',
  });
});

test('set type menu click mutates only the target set type and clears completion marker', async () => {
  const result = await runHarness(async () => {
    window.__entry = {
      exerciseCompletedAt: 12345,
      sets: [
        {
          kg: 40,
          reps: 10,
          rir: 2,
          romPct: 100,
          setType: 'main',
          done: true,
          wendlerRole: 'main',
          wendlerPct: 80,
          supplementalKind: 'bbb',
          amrap: true,
        },
      ],
    };
    window.renderWorkoutCalendarHome();
    document.querySelector('.wt-max-set-type-btn').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    document.querySelector('[data-set-type="failure"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    return {
      entry: window.__entry,
      menuOpenCount: document.querySelectorAll('[data-wt-set-type-option]').length,
      typeText: document.querySelector('.wt-max-set-type-btn')?.textContent?.replace(/\s+/g, ' ').trim(),
      mutateCalls: window.__mutateCalls,
      markerCleared: window.__completionMarkerCleared === true,
    };
  });

  assert.equal(result.entry.sets.length, 1);
  assert.equal(result.entry.sets[0].setType, 'failure');
  assert.equal(result.entry.sets[0].kg, 40);
  assert.equal(result.entry.sets[0].reps, 10);
  assert.equal(result.entry.sets[0].done, true);
  assert.equal('wendlerRole' in result.entry.sets[0], false);
  assert.equal('wendlerPct' in result.entry.sets[0], false);
  assert.equal('supplementalKind' in result.entry.sets[0], false);
  assert.equal('amrap' in result.entry.sets[0], false);
  assert.equal('exerciseCompletedAt' in result.entry, false);
  assert.equal(result.markerCleared, true);
  assert.equal(result.menuOpenCount, 0);
  assert.equal(result.typeText, '1실패');
  assert.equal(result.mutateCalls.length, 1);
  assert.equal(result.mutateCalls[0].targetKey, '2026-07-04');
  assert.equal(result.mutateCalls[0].targetSessionIndex, 0);
  assert.equal(result.mutateCalls[0].exerciseIndex, '0');
  assert.deepEqual(result.mutateCalls[0].options, { preserveSheetScroll: true });
});

test('typing a weight and tapping the left check commits the value before toggling', { timeout: 30000 }, async () => {
  const result = await runHarnessPage(async (page) => {
    await page.evaluate(() => {
      window.__entry = {
        sets: [
          { kg: 20, reps: 10, rir: 2, romPct: 100, setType: 'main', done: false },
          { kg: 20, reps: 10, rir: 2, romPct: 100, setType: 'main', done: false },
        ],
      };
      window.__doneToggleCalls = [];
      window.__mutateCalls = [];
      window.renderWorkoutCalendarHome();
    });

    async function tapSelector(selector) {
      const handle = await page.waitForSelector(selector, { visible: true });
      const box = await handle.boundingBox();
      assert.ok(box, `${selector} should have a bounding box`);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    await tapSelector('[data-wt-set-edit-field="kg"][data-set-index="0"]');
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]'));

    // 커스텀 키패드는 값을 프로그램으로 넣으므로 change 이벤트가 없다. dirty 표시만
    // 남은 상태에서 왼쪽 체크를 누르는 것이 사용자가 겪은 초기화 상황이다.
    await page.$eval('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]', (input) => {
      input.value = '40';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const beforeTap = await page.evaluate(() => ({
      dirty: document.querySelector('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]')?.getAttribute('data-wt-set-keyboard-dirty'),
      storedKg: window.__entry.sets[0].kg,
    }));

    await tapSelector('[data-wt-set-done-toggle][data-set-index="0"]');
    await page.waitForFunction(() => window.__doneToggleCalls.length === 1);

    return {
      beforeTap,
      doneToggleCalls: await page.evaluate(() => window.__doneToggleCalls),
      entry: await page.evaluate(() => window.__entry),
      lastToast: await page.evaluate(() => window.__lastToast || null),
    };
  });

  // 탭 직전에는 아직 저장되지 않은 입력이 남아 있다.
  assert.equal(result.beforeTap.dirty, 'true');
  assert.equal(result.beforeTap.storedKg, 20);
  // 완료 토글이 실행될 때 이미 40이 반영돼 있어야 한다. 그렇지 않으면 토글이
  // 예전 값(20)으로 행을 다시 그리면서 입력이 초기화된다.
  assert.equal(result.doneToggleCalls.length, 1);
  assert.equal(result.doneToggleCalls[0].setIndex, 0);
  assert.equal(result.doneToggleCalls[0].kg, 40);
  assert.equal(result.entry.sets[0].kg, 40);
  assert.equal(result.entry.sets[0].reps, 10);
  // 다른 세트는 건드리지 않는다.
  assert.equal(result.entry.sets[1].kg, 20);
});

// 세트 값을 넣을 때마다 #workout-calendar-root를 통째로 다시 그리면(월 달력 +
// 시트 + 러닝 지도 재장착) 행을 옮길 때마다 화면 전체가 교체돼 깜빡인다.
// 값 편집은 시트 구조를 바꾸지 않으므로 요약 카드와 종목 카드만 갈아끼워야 한다.
test('entering set values across a row patches the cards instead of rerendering the calendar', async () => {
  const result = await runHarnessPage(async (page) => {
    await page.evaluate(() => {
      window.__entry = {
        name: '벤치프레스',
        exerciseId: 'bench-press',
        sets: [
          { kg: 70, reps: 10, rir: 2, romPct: 100, setType: 'main', done: false },
          { kg: 40, reps: 12, rir: 2, romPct: 100, setType: 'main', done: false },
        ],
      };
      window.__mutateCalls = [];
      window.renderWorkoutCalendarHome();
      window.__renderCalls = 0;
      window.__scroller = document.querySelector('.wt-day-sheet-scroll');
      window.__sheet = document.querySelector('[data-wt-day-sheet]');
    });

    async function tapSelector(selector) {
      const handle = await page.waitForSelector(selector, { visible: true });
      const box = await handle.boundingBox();
      assert.ok(box, `${selector} should have a bounding box`);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    // 첫 행에 들어간다. 값 버튼이 입력칸으로 바뀌는 구조 변화다.
    await tapSelector('[data-wt-set-edit-field="kg"][data-set-index="0"]');
    await page.waitForFunction(() => document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]'));
    const enteredRow = await page.evaluate(() => ({
      renderCalls: window.__renderCalls,
      // 스크롤 컨테이너와 시트가 살아 있어야 스크롤 위치도 위임 리스너도 유지된다.
      sameScroller: window.__scroller === document.querySelector('.wt-day-sheet-scroll'),
      sameSheet: window.__sheet === document.querySelector('[data-wt-day-sheet]'),
      inlineMounted: !!document.querySelector('[data-wt-set-inline-input][data-field="kg"][data-set-index="0"]'),
    }));

    // 값을 넣고 다음 행으로 넘어간다. 여기서 저장(낙관적 갱신)이 일어난다.
    await tapSelector('[data-wt-set-keyboard-key="9"]');
    await tapSelector('[data-wt-set-keyboard-key="5"]');
    await tapSelector('[data-wt-set-edit-field="kg"][data-set-index="1"]');
    await page.waitForFunction(() => (
      window.__entry.sets[0]?.kg === 95
      && document.activeElement?.matches?.('[data-wt-set-inline-input][data-field="kg"][data-set-index="1"]')
    ), { timeout: 2000 });
    const movedRow = await page.evaluate(() => ({
      renderCalls: window.__renderCalls,
      sameScroller: window.__scroller === document.querySelector('.wt-day-sheet-scroll'),
      sameSheet: window.__sheet === document.querySelector('[data-wt-day-sheet]'),
      storedKg: window.__entry.sets[0]?.kg ?? null,
      // 앞 행은 다시 값 버튼으로 돌아가 있어야 한다.
      firstRowButton: !!document.querySelector('[data-wt-set-edit-field="kg"][data-set-index="0"]'),
      secondRowInline: !!document.querySelector('[data-wt-set-inline-input][data-field="kg"][data-set-index="1"]'),
    }));

    return { enteredRow, movedRow };
  });

  // 행에 들어가고 값 넣고 다음 행으로 옮기는 동안 전체 렌더는 한 번도 돌지 않는다.
  assert.equal(result.enteredRow.renderCalls, 0);
  assert.equal(result.movedRow.renderCalls, 0);
  assert.equal(result.enteredRow.inlineMounted, true);
  assert.equal(result.enteredRow.sameScroller, true);
  assert.equal(result.enteredRow.sameSheet, true);
  assert.equal(result.movedRow.sameScroller, true);
  assert.equal(result.movedRow.sameSheet, true);
  // 깜빡임을 없애면서 화면은 실제로 갱신돼야 한다.
  assert.equal(result.movedRow.storedKg, 95);
  assert.equal(result.movedRow.firstRowButton, true);
  assert.equal(result.movedRow.secondRowInline, true);
});

// 처방이 붙은 종목 카드는 처방을, 아닌 카드는 "오늘 최고 세트"를 브라우저에서 그린다.
test('exercise card goal block renders the prescription or labels the best set in a browser DOM', async () => {
  const result = await runHarnessPage(page => page.evaluate(() => {
    const read = () => {
      const block = document.querySelector('.wt-max-plan-goal');
      return { label: block?.querySelector('span')?.textContent?.trim(), value: block?.querySelector('strong')?.textContent?.trim() };
    };
    window.__entry = {
      name: '스쿼트(와이드)',
      exerciseId: 'squat-wide',
      sets: [
        { kg: 103.8, reps: 3, rir: 2, romPct: 100, setType: 'main', done: true },
        { kg: 126.3, reps: 1, rir: 2, romPct: 100, setType: 'main', done: true },
      ],
    };
    window.renderWorkoutCalendarHome();
    const bestOnly = read();
    window.__entry.maxPrescription = { startKg: 60, repsLow: 8, repsHigh: 12 };
    window.renderWorkoutCalendarHome();
    return { bestOnly, planned: read() };
  }));

  // 처방이 없으면 오늘 최고 세트라고 밝힌다. 예전에는 이걸 "성공 기준"이라 불렀다.
  // bestWorkoutSet은 kg×reps가 최대인 세트다(103.8×3=311 > 126.3×1=126).
  assert.equal(result.bestOnly.label, '오늘 최고 세트');
  assert.equal(result.bestOnly.value, '103.8kg × 3회');
  // 처방이 있으면 처방을 적는다. 오늘 든 최고 중량이 아니라.
  assert.equal(result.planned.label, '오늘 성공 기준');
  assert.equal(result.planned.value, '60kg × 8-12회');
});
