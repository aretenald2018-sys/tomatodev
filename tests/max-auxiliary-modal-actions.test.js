import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} should exist`);
  const end = source.indexOf(endToken, start);
  assert.notEqual(end, -1, `${endToken} should exist after ${startToken}`);
  return source.slice(start, end);
}

function linesWith(source, pattern) {
  return source
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => pattern.test(line));
}

const maxJs = read('workout/expert/max.js');
const maxCycleJs = read('workout/expert/max-cycle.js');
const swJs = read('sw.js');

test('Max auxiliary modals use a scoped data action bridge', () => {
  assert.match(maxJs, /function _bindMaxModalActions\(modal, handlers = \{\}\)/);
  assert.match(maxJs, /modal\.dataset\.maxModalActionsBound/);
  assert.match(maxJs, /\[data-max-modal-action\]/);
  assert.match(maxJs, /Promise\.resolve\(handler\(control, event\)\)/);
});

test('recommendation adjust modal no longer renders inline handlers', () => {
  const modal = sliceBetween(maxJs, 'function _ensureMaxAdjustModal()', 'export function openMaxRecAdjustModal');

  assert.match(modal, /id="max-rec-adjust-modal"/);
  assert.match(modal, /data-max-modal-action="close-rec-adjust"/);
  assert.match(modal, /data-max-modal-action="apply-rec-adjust"/);
  assert.match(modal, /'apply-rec-adjust': \(\) => applyMaxAdjustedRecommendation\(\)/);
  assert.doesNotMatch(modal, /onclick=/);
});

test('equipment and cleanse modals route close/save/history/delete through data actions', () => {
  const equipment = sliceBetween(maxJs, 'function _ensureMaxEquipmentPoolModal()', 'function _currentEquipmentModalGymId');
  const cleanse = sliceBetween(maxJs, 'function _renderCleanseExerciseRows', 'export async function saveMaxDataCleanseModal');

  assert.match(equipment, /data-max-modal-action="close-equipment-pool"/);
  assert.match(equipment, /'close-equipment-pool': \(\) => closeMaxEquipmentPoolModal\(\)/);
  assert.doesNotMatch(equipment, /onclick=/);

  assert.match(cleanse, /data-max-modal-action="open-ex-history"/);
  assert.match(cleanse, /data-max-modal-action="delete-cleanse-exercise"/);
  assert.match(cleanse, /data-max-modal-action="close-data-cleanse"/);
  assert.match(cleanse, /data-max-modal-action="save-data-cleanse"/);
  assert.match(cleanse, /'delete-cleanse-exercise': \(control\) => deleteMaxCleanseExercise\(control\.getAttribute\('data-ex-id'\)\)/);
  assert.doesNotMatch(cleanse, /onclick=/);
});

test('exercise history and blueprint modals use modal-local data actions', () => {
  const history = sliceBetween(maxJs, 'function _ensureMaxExerciseHistoryModal()', 'export function openMaxExerciseHistoryModal');
  const blueprint = sliceBetween(maxJs, 'function _ensureMaxBlueprintModal()', 'export function closeMaxBlueprintModal');

  assert.match(history, /data-max-modal-action="close-ex-history"/);
  assert.match(history, /data-max-modal-action="save-ex-history"/);
  assert.match(history, /'save-ex-history': \(\) => saveMaxExerciseHistoryModal\(\)/);
  assert.doesNotMatch(history, /onclick=/);

  assert.match(blueprint, /data-max-modal-action="close-blueprint"/);
  assert.match(blueprint, /data-max-modal-action="save-blueprint"/);
  assert.match(blueprint, /'save-blueprint': \(\) => saveMaxBlueprintModal\(\)/);
  assert.doesNotMatch(blueprint, /onclick=/);
});

test('Max entry and mini onboarding controls avoid lazy inline globals', () => {
  const majorGate = sliceBetween(maxJs, 'function _renderMaxTodayMajorGate', 'function _cycleForTodayMajors');
  const miniOnboarding = sliceBetween(maxJs, 'function _renderMaxObStep1()', '// 모달 이벤트 위임');

  assert.match(majorGate, /data-action="switch-normal-view"/);
  assert.match(maxJs, /data-action="switch-normal-view"[\s\S]*window\.wtExcSwitchToNormalView\?\.\(\)/);
  assert.doesNotMatch(majorGate, /onclick=/);

  assert.match(miniOnboarding, /data-close-max-ob/);
  assert.doesNotMatch(miniOnboarding, /onclick=/);
});

test('remaining Max inline handlers are limited to the existing V4 sheet shell', () => {
  assert.doesNotMatch(maxCycleJs, /onclick=/);

  const remaining = linesWith(maxJs, /onclick=/);
  assert.equal(remaining.length, 2);
  assert.match(remaining[0].line, /id="max-v4-sheet" onclick="if\(event\.target===this\) closeMaxV4Sheet\(\)"/);
  assert.match(remaining[1].line, /class="wt-v4-sheet" onclick="event\.stopPropagation\(\)"/);
});

test('service worker cache version was bumped for Max auxiliary modal actions', () => {
  assert.match(swJs, /tomatofarm-v20260703z17-max-render-scheduler/);
});
