import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('stats renders health metrics as rolled-back kcal and monthly report cards driven by top period controls', () => {
  assert.match(indexHtml, /id="kcal-weight-chart"/);
  assert.match(indexHtml, /id="kcal-weight-meta"/);
  assert.match(indexHtml, /id="calorie-month-chart"/);
  assert.match(indexHtml, /id="calorie-month-summary"/);
  assert.match(indexHtml, /data-stats-analysis-period="week"/);
  assert.doesNotMatch(indexHtml, /id="health-metrics-chart"/);
  assert.doesNotMatch(indexHtml, /id="health-metrics-legend"/);
  assert.doesNotMatch(indexHtml, /id="health-metrics-charts"/);
  assert.doesNotMatch(indexHtml, /class="stats-health-curves"/);
  assert.doesNotMatch(indexHtml, /data-health-period=/);
  assert.doesNotMatch(indexHtml, /data-health-series=/);
  assert.doesNotMatch(indexHtml, /id="checkin-chart"/);
});

test('stats health rollback charts render the old combined weight and calorie report canvases', () => {
  assert.match(statsJs, /function _renderKcalWeightChart/);
  assert.match(statsJs, /function _renderCalorieReport/);
  assert.match(statsJs, /const _kcalWeightCharts = new WeakMap\(\)/);
  assert.match(statsJs, /const _calorieMonthCharts = new WeakMap\(\)/);
  assert.match(statsJs, /_renderKcalWeightChart\(scope\);[\s\S]*_renderCalorieReport\(scope\);/);
  assert.match(statsJs, /getDayTargetKcal/);
  assert.match(statsJs, /label:\s*'체중'/);
  assert.match(statsJs, /label:\s*'섭취칼로리'/);
  assert.match(statsJs, /label:\s*'운동칼로리'/);
  assert.match(statsJs, /label:\s*'목표'/);
  assert.match(statsJs, /calcBurnedKcal\(day, weightForBurn\)\.total/);
  assert.doesNotMatch(statsJs, /_healthChartPeriod/);
  assert.doesNotMatch(statsJs, /\[data-health-period\]/);
  assert.doesNotMatch(statsJs, /\[data-health-series\]/);
  assert.doesNotMatch(statsJs, /let _healthMetricsChart = null/);
  assert.doesNotMatch(statsJs, /_renderCheckinChart\(\)/);
});

test('stats health rollback chart cards are styled and cache version is bumped', () => {
  assert.match(styleCss, /\.stats-chart-wrap/);
  assert.match(styleCss, /\.calorie-summary-grid/);
  assert.match(styleCss, /\.calorie-meal-grid/);
  assert.doesNotMatch(styleCss, /\.stats-health-toggle/);
  assert.doesNotMatch(styleCss, /\.stats-health-curves/);
  assert.doesNotMatch(styleCss, /\.stats-health-period/);
  assert.match(swJs, /tomatofarm-v20260629z20-trainer-top-map-zoom/);
});
