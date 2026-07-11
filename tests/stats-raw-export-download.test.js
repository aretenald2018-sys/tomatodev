import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('stats page places raw export button in the period analysis control card', () => {
  assert.match(indexHtml, /class="stats-analysis-controls"[\s\S]*data-stats-raw-export[\s\S]*전체통계 다운로드[\s\S]*class="stats-analysis-periods"/);
  assert.match(indexHtml, /class="stats-block stats-muscle-fatigue-block"/);
  assert.match(indexHtml, /data-stats-raw-export[\s\S]*class="stats-block stats-muscle-fatigue-block"/);
  assert.doesNotMatch(indexHtml, /openExportModal\(\)/);
  assert.doesNotMatch(indexHtml, /CSV 내보내기/);
});

test('stats raw export preserves daily workout and diet payload contracts as JSON', () => {
  assert.match(statsJs, /WORKOUT_PAYLOAD_KEYS, DIET_PAYLOAD_KEYS, SHARED_PAYLOAD_KEYS/);
  assert.match(statsJs, /export function buildStatsRawExport\(\)/);
  assert.match(statsJs, /schema: 'tomatofarm\.rawDailyStats\.v1'/);
  assert.match(statsJs, /daily,/);
  assert.match(statsJs, /bodyCheckins: checkins\.map\(_jsonSafeClone\)/);
  assert.match(statsJs, /raw:\s*\{[\s\S]*workout: _pickRawFields\(day, _RAW_WORKOUT_KEYS\)[\s\S]*diet: _pickRawFields\(day, _RAW_DIET_KEYS\)[\s\S]*shared: _pickRawFields\(day, SHARED_PAYLOAD_KEYS\)[\s\S]*day: _jsonSafeClone\(day \|\| \{\}\)/);
  assert.match(readFileSync('workout/save-schema.js', 'utf8'), /'restBetweenSets'/);
  assert.match(statsJs, /hasExerciseRecord\(y, m, d\)/);
  assert.match(statsJs, /hasDietRecord\(y, m, d\)/);
  assert.match(statsJs, /dietDayOk\(y, m, d\)/);
});

test('stats raw export binds download action directly and gives toast feedback', () => {
  assert.match(statsJs, /function _bindStatsRawExportControls/);
  assert.match(statsJs, /_bindStatsRawExportControls\(root\)/);
  assert.match(statsJs, /\[data-stats-raw-export\]/);
  assert.match(statsJs, /tomatofarm-raw-stats-\$\{payload\.today\}\.json/);
  assert.match(statsJs, /application\/json;charset=utf-8/);
  assert.match(statsJs, /showToast\?\.\(`전체통계 \$\{payload\.counts\.totalDays\}일 raw 데이터를 다운로드했어요`/);
});

test('stats raw export button uses compact TDS-style controls and bumped cache', () => {
  assert.match(styleCss, /\.stats-analysis-actions/);
  assert.match(styleCss, /\.stats-raw-export-btn\s*\{/);
  assert.match(styleCss, /border:\s*1px solid var\(--seed-stroke-neutral\)/);
  assert.match(styleCss, /border-radius:\s*var\(--seed-r-full\)/);
  assert.match(styleCss, /\.stats-raw-export-btn:focus-visible/);
  assert.match(swJs, /tomatofarm-v20260711z10-diet-search-live-food-db/);
});
