import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const exercisesJs = readFileSync(new URL('../workout/exercises.js', import.meta.url), 'utf8');
const cardioModelJs = readFileSync(new URL('../workout/cardio-model.js', import.meta.url), 'utf8');
const styleCss = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const cardioImageIds = Object.freeze([
  'my-mountain',
  'rowing',
  'recumbent-bike',
  'step-machine',
  'stationary-bike',
  'indoor-cycling',
  'treadmill-running',
]);

function functionBody(name) {
  const start = exercisesJs.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} should exist`);
  const next = exercisesJs.indexOf('\nfunction ', start + 1);
  return exercisesJs.slice(start, next > start ? next : exercisesJs.length);
}

test('running and cardio are picker body categories, not separate activity tiles', () => {
  assert.match(exercisesJs, /const PICKER_BODY_CATEGORIES = Object\.freeze\(\[/);
  assert.match(exercisesJs, /id:\s*'running'[\s\S]*label:\s*'런닝\/조깅'[\s\S]*action:\s*'running'/);
  assert.match(exercisesJs, /id:\s*'cardio'[\s\S]*label:\s*'유산소'[\s\S]*action:\s*'cardio'/);
  assert.match(exercisesJs, /function _renderPickerBodyCategoryTiles/);
  assert.match(exercisesJs, /function _pickerBodyCategoryFigureHtml/);

  assert.doesNotMatch(exercisesJs, /data-picker-activity=/);
  assert.doesNotMatch(exercisesJs, /function _renderPickerActivityTiles/);
  assert.doesNotMatch(exercisesJs, /function _pickerRunningFigureHtml/);
  assert.doesNotMatch(exercisesJs, /function _pickerManualCardioFigureHtml/);
  assert.doesNotMatch(exercisesJs, /ex-picker-activity-figure/);
});

test('cardio view uses the same top-tab hierarchy as muscle exercise lists', () => {
  const tabs = functionBody('_renderPickerTabs');

  assert.doesNotMatch(tabs, /_pickerView === 'cardio' && !_pickerSearchQuery/);
  assert.doesNotMatch(tabs, /button\(\{\s*key:\s*'cardio',\s*label:\s*'유산소',\s*active:\s*true\s*\}\)/);
  assert.match(tabs, /ctx\.visibleMuscles\.map/);
  assert.match(tabs, /PICKER_BODY_CATEGORIES/);
  assert.match(tabs, /querySelector\('\.ex-picker-tab\.active'\)\?\.scrollIntoView/);
  assert.match(tabs, /tab === 'cardio'[\s\S]*_openPickerCardioList\(\)/);
});

test('body category figures share the muscle tile visual primitive', () => {
  assert.doesNotMatch(styleCss, /\.ex-picker-activity-figure/);
  assert.match(styleCss, /\.ex-picker-body-figure/);
  assert.match(styleCss, /\.ex-picker-body-figure\.has-asset/);
  assert.match(styleCss, /\.ex-picker-muscle-figure\.ex-picker-body-figure\.has-asset img/);
  assert.match(styleCss, /\.ex-picker-body-figure--cardio/);
});

test('picker gym rail labels keep Korean branch names intact', () => {
  const railLabelRule = styleCss.slice(
    styleCss.indexOf('.ex-picker-rail-chip span'),
    styleCss.indexOf('.ex-picker-rail-chip b'),
  );

  assert.match(railLabelRule, /word-break:\s*keep-all/);
  assert.match(railLabelRule, /-webkit-line-clamp:\s*2/);
  assert.doesNotMatch(railLabelRule, /overflow-wrap:\s*anywhere/);
});

test('cardio picker rows use per-exercise gray image assets with body fallback', () => {
  assert.match(cardioModelJs, /const CARDIO_PICKER_ASSET_BASE = '\.\/assets\/workout\/cardio\/'/);
  assert.match(exercisesJs, /function _pickerCardioFigureHtml/);
  assert.match(exercisesJs, /data-picker-cardio-img/);
  assert.match(exercisesJs, /function _bindPickerCardioFigureFallback/);
  assert.match(functionBody('_renderPickerCardioList'), /_pickerCardioFigureHtml\(cardio\)/);
  assert.match(functionBody('_renderPickerCardioListToolbar'), /ex-picker-list-toolbar ex-picker-cardio-toolbar/);
  assert.match(functionBody('_renderPickerCardioListToolbar'), /ex-picker-sort-btn/);
  assert.doesNotMatch(functionBody('_renderPickerCardioList'), /ex-picker-cardio-meta/);
  assert.doesNotMatch(styleCss, /\.ex-picker-cardio-meta/);
  assert.match(functionBody('_bindPickerCardioFigureFallback'), /_pickerBodyCategoryFigureHtml\(_pickerBodyCategoryById\('cardio'\)\)/);
  assert.match(styleCss, /\.ex-picker-cardio-figure/);
  assert.match(styleCss, /\.ex-picker-muscle-figure\.ex-picker-cardio-figure\.has-asset img/);
  assert.match(cardioModelJs, /마이마운틴/);

  for (const id of cardioImageIds) {
    assert.match(cardioModelJs, new RegExp(`id:\\s*'${id}'[\\s\\S]*image:`));
    assert.ok(cardioModelJs.includes(`image: \`\${CARDIO_PICKER_ASSET_BASE}${id}.png\``), `${id} catalog item should reference its image asset`);
    const bytes = readFileSync(new URL(`../assets/workout/cardio/${id}.png`, import.meta.url));
    assert.ok(bytes.length > 2000, `${id} asset should not be an empty placeholder`);
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
    assert.ok([4, 6].includes(bytes[25]), `${id} PNG should include alpha`);
  }
});
