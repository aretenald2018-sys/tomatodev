import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exercisesJs = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const css = (await readFile(new URL('../style.css', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');

function sliceByFirstBrace(source, startToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} should exist`);
  let open = -1;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] !== '{') continue;
    const before = source.slice(start, i);
    if (!(/\)\s*$/.test(before) || /=>\s*$/.test(before))) continue;
    open = i;
    break;
  }
  assert.notEqual(open, -1, `${startToken} should have a body`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${startToken} body should close`);
}

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`).exec(css);
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('exercise picker category rail is driven by saved gyms, not custom/equipment hardcoding', () => {
  const category = sliceByFirstBrace(exercisesJs, 'function _renderPickerCategory');

  assert.match(category, /\(ctx\.gyms \|\| \[\]\)\.map/);
  assert.match(category, /data-picker-gym="all"/);
  assert.match(category, /data-picker-gym="\$\{_escPicker\(gymId\)\}"/);
  assert.match(category, /data-picker-action="manage-gyms"/);
  assert.match(category, /헬스장 관리/);
  assert.match(category, /_wtSetPickerGymCategoryFilter/);

  assert.doesNotMatch(category, /data-picker-summary/);
  assert.doesNotMatch(category, /커스텀 <b>/);
  assert.doesNotMatch(category, /data-picker-action="equipment"/);
  assert.doesNotMatch(category, /기구 관리/);
});

test('exercise picker preserves selected gym scope when entering muscle lists', () => {
  const openList = sliceByFirstBrace(exercisesJs, 'function _openPickerList');
  const handleBack = sliceByFirstBrace(exercisesJs, 'function _handlePickerBack');
  const tabs = sliceByFirstBrace(exercisesJs, 'function _renderPickerTabs');
  const category = sliceByFirstBrace(exercisesJs, 'function _renderPickerCategory');

  assert.match(openList, /options = \{\}/);
  assert.match(openList, /if \(!options\.preserveGymScope\) _resetPickerGymScope\(\)/);
  assert.match(handleBack, /_openPickerCategory\(\{ preserveGymScope: true \}\)/);
  assert.match(tabs, /_openPickerCategory\(\{ preserveGymScope: true \}\)/);
  assert.match(tabs, /_openPickerList\(_pickerListMode, btn\.getAttribute\('data-picker-muscle-tab'\), \{ preserveGymScope: true \}\)/);
  assert.match(category, /_openPickerList\('all', btn\.getAttribute\('data-picker-muscle'\), \{ preserveGymScope: true \}\)/);
});

test('specific gym scope includes global exercises and feeds list rendering', () => {
  const usableAtGym = sliceByFirstBrace(exercisesJs, 'function _isExerciseUsableAtGym');
  const list = sliceByFirstBrace(exercisesJs, 'export function _renderPickerList');

  assert.match(usableAtGym, /scope === 'all' \|\| _isExerciseGlobalScope\(ex\)/);
  assert.match(list, /_applyPickerGymScope\(modeFiltered, _pickerGymFilter\)/);
  assert.doesNotMatch(list, /_exerciseGymIds\(e\)\.includes\(_pickerGymFilter\)/);
});

test('exercise picker equipment manager opens for the selected rail gym', () => {
  const selectedGym = sliceByFirstBrace(exercisesJs, 'function _selectedPickerManagerGymId');
  const manager = sliceByFirstBrace(exercisesJs, 'async function _openPickerEquipmentManager');

  assert.match(selectedGym, /_isConcretePickerGymFilter\(_pickerGymFilter\)/);
  assert.match(selectedGym, /getGyms\?\.\(\) \|\| \[\]/);
  assert.match(manager, /openMaxEquipmentPoolModal\(\{ gymId: _selectedPickerManagerGymId\(gymId\) \}\)/);
});

test('exercise picker rail chips keep active and Korean-safe multiline gym labels', () => {
  const chip = ruleBody('.ex-picker-rail-chip,\n.ex-picker-rail-action');
  const label = ruleBody('.ex-picker-rail-chip span');
  const active = ruleBody('.ex-picker-rail-chip.active');

  assert.match(chip, /display:\s*grid/);
  assert.match(label, /word-break:\s*keep-all/);
  assert.match(label, /-webkit-line-clamp:\s*2/);
  assert.doesNotMatch(label, /overflow-wrap:\s*anywhere/);
  assert.match(active, /border-color:\s*rgba\(250,\s*52,\s*44,\s*0\.62\)/);
});
