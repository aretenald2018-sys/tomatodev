import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('stats page includes exercise performance trend before volume trend', () => {
  assert.match(indexHtml, /운동별 퍼포먼스 추이[\s\S]*id="exercise-performance-section"[\s\S]*종목별 볼륨 추이/);
  assert.match(statsJs, /data-stats-id="exercise-performance-section"[\s\S]*data-stats-id="volume-section"/);
});

test('exercise performance trend uses period-scoped volume and estimated 1rm signals', () => {
  assert.match(statsJs, /const PERFORMANCE_MAJORS = \['chest', 'back', 'shoulder', 'lower', 'bicep', 'tricep', 'abs'\]/);
  assert.match(statsJs, /function _buildExercisePerformanceRows/);
  assert.match(statsJs, /range\.fromKey/);
  assert.match(statsJs, /range\.toKey/);
  assert.match(statsJs, /calcVolume\(entry\.sets \|\| \[\]\)/);
  assert.match(statsJs, /_topSetE1rm\(entry\)/);
  assert.match(statsJs, /\.slice\(0, 2\)/);
  assert.match(statsJs, /성장중/);
  assert.match(statsJs, /유지중/);
  assert.match(statsJs, /점검필요/);
});

test('exercise performance card uses TDS-like compact table styling', () => {
  assert.match(styleCss, /\.stats-performance-block/);
  assert.match(styleCss, /\.stats-perf-table/);
  assert.match(styleCss, /\.stats-perf-row/);
  assert.match(styleCss, /\.stats-perf-spark/);
  assert.match(styleCss, /\.stats-perf-status/);
  assert.match(styleCss, /\.stats-perf-row\.is-growth \.stats-perf-status b \{ color: #2563eb; \}/);
  assert.doesNotMatch(styleCss, /\.stats-perf-row\.is-growth \.stats-perf-status b \{ color: var\(--diet-ok\); \}/);
  assert.match(swJs, /tomatofarm-v20260702z6-home-running-map-park-scale/);
});
