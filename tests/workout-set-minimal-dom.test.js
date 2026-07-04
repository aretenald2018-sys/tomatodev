import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');

function extractFunctionSource(source, name) {
  const asyncStart = source.indexOf(`async function ${name}`);
  const normalStart = source.indexOf(`function ${name}`);
  const start = asyncStart >= 0 ? asyncStart : normalStart;
  assert.ok(start >= 0, `${name} should exist`);
  const signatureEnd = source.indexOf(') {', start);
  const braceStart = signatureEnd >= 0 ? signatureEnd + 2 : source.indexOf('{', start);
  assert.ok(braceStart > start, `${name} body should start`);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body should end`);
}

function extractConstArraySource(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  assert.ok(start >= 0, `${name} should exist`);
  const end = source.indexOf('];', start);
  assert.ok(end > start, `${name} array should end`);
  return source.slice(start, end + 2);
}

function buildHarnessScript() {
  const functionNames = [
    '_normalizeWorkoutSetType',
    '_workoutSheetInputValue',
    '_formatWorkoutKg',
    '_formatWorkoutReps',
    '_workoutSetTypeLabel',
    '_workoutSetTypeClass',
    '_workoutSetEditorKey',
    '_isWorkoutSetEditorExpanded',
    '_isWorkoutSetTypeMenuOpen',
    '_renderWorkoutSetInput',
    '_renderWorkoutSetAddRow',
    '_renderWorkoutSetTypeMenu',
    '_renderWorkoutSetRows',
    '_toggleWorkoutSetEditorFromSheet',
    '_toggleWorkoutSetTypeMenuFromSheet',
    '_setWorkoutExerciseSetTypeFromSheet',
  ];
  const sourceBundle = [
    extractConstArraySource(calendarJs, 'WORKOUT_SET_TYPE_OPTIONS'),
    ...functionNames.map(name => extractFunctionSource(calendarJs, name)),
  ].join('\n\n');

  return `
    const WORKOUT_GYM_SESSION_COUNT = 2;
    let _workoutHomeSelectedKey = '2026-07-04';
    let _workoutHomeSessionIndex = 0;
    let _workoutHomeSheetState = 'bar';
    const _workoutOpenSetTypeMenus = new Set();
    const _workoutExpandedSetEditors = new Set();
    window.__renderCalls = 0;
    window.__syncCalls = [];
    window.__restoreCalls = [];
    window.__mutateCalls = [];

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
    function _defaultWorkoutSheetSet(prev = {}) {
      return { kg: prev.kg ?? '', reps: prev.reps ?? '', setType: prev.setType || 'main', done: false };
    }
    function _clearWorkoutExerciseCompletionMarker(entry) {
      delete entry.exerciseCompletedAt;
      window.__completionMarkerCleared = true;
    }

    ${sourceBundle}

    window.__entry = { sets: [] };
    function _rowFromEntry() {
      return {
        rawSetDetails: (window.__entry.sets || []).map((set, index) => ({ ...set, setIndex: index })),
      };
    }
    function renderWorkoutCalendarHome() {
      window.__renderCalls += 1;
      document.body.innerHTML = _renderWorkoutSetRows(_rowFromEntry(), {
        editable: true,
        key: '2026-07-04',
        sessionIndex: 0,
        exerciseIndex: 0,
        cardId: 'qa-card',
      });
    }
    async function _mutateWorkoutExerciseFromSheet(targetKey, targetSessionIndex, exerciseIndex, mutator, options = {}) {
      const ok = mutator(window.__entry);
      window.__mutateCalls.push({ targetKey, targetSessionIndex, exerciseIndex, options });
      renderWorkoutCalendarHome();
      return ok;
    }
    document.addEventListener('click', async event => {
      const control = event.target.closest('[data-wt-sheet-card-action]');
      if (!control) return;
      const action = control.getAttribute('data-wt-sheet-card-action');
      const key = control.getAttribute('data-date-key');
      const sessionIndex = control.getAttribute('data-session-index');
      const exerciseIndex = control.getAttribute('data-exercise-index');
      const setIndex = control.getAttribute('data-set-index');
      if (action === 'toggle-set-editor') _toggleWorkoutSetEditorFromSheet(key, sessionIndex, exerciseIndex, setIndex);
      if (action === 'toggle-set-type') _toggleWorkoutSetTypeMenuFromSheet(key, sessionIndex, exerciseIndex, setIndex);
      if (action === 'set-set-type') await _setWorkoutExerciseSetTypeFromSheet(key, sessionIndex, exerciseIndex, setIndex, control.getAttribute('data-set-type'));
    });
    window.renderWorkoutCalendarHome = renderWorkoutCalendarHome;
    window.__harnessReady = true;
  `;
}

async function runHarness(fn) {
  const harnessScript = buildHarnessScript();
  assert.doesNotThrow(() => new Function(harnessScript));
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
    await page.setContent('<!doctype html><html lang="ko"><body></body></html>');
    await page.addScriptTag({ content: harnessScript });
    const ready = await page.evaluate(() => window.__harnessReady === true);
    assert.deepEqual(pageErrors, []);
    assert.equal(ready, true);
    const result = await page.evaluate(fn);
    assert.deepEqual(pageErrors, []);
    return result;
  } finally {
    await browser.close();
  }
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
  assert.equal(result.collapsed.typeText, '1본');
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
