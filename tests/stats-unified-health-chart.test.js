import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('stats renders health metrics as per-metric curve cards with period controls', () => {
  assert.match(indexHtml, /id="health-metrics-charts"/);
  assert.match(indexHtml, /class="stats-health-curves"/);
  assert.match(indexHtml, /data-health-period="30"/);
  assert.match(indexHtml, /data-health-period="60"/);
  assert.match(indexHtml, /data-health-period="90"/);
  assert.match(indexHtml, /data-health-period="all"/);
  assert.doesNotMatch(indexHtml, /id="health-metrics-chart"/);
  assert.doesNotMatch(indexHtml, /data-health-series=/);
  assert.doesNotMatch(indexHtml, /id="calorie-month-chart"/);
  assert.doesNotMatch(indexHtml, /id="checkin-chart"/);
});

test('stats health chart renders one Chart.js line per metric card', () => {
  assert.match(statsJs, /function _renderHealthMetricsChart/);
  assert.match(statsJs, /const _healthMetricsCharts = new WeakMap\(\)/);
  assert.match(statsJs, /HEALTH_CHART_SERIES/);
  assert.match(statsJs, /function _healthChartSeriesWithData/);
  assert.match(statsJs, /function _healthCurveCardHtml/);
  assert.match(statsJs, /function _drawHealthCurveChart/);
  assert.match(statsJs, /data-health-chart="\$\{_esc\(key\)\}"/);
  assert.match(statsJs, /data:\s*\{\s*labels,\s*datasets:\s*\[_healthDataset\(key,\s*values\)\]\s*\}/);
  assert.match(statsJs, /bodyFat:\s*\{\s*label:\s*'체지방률'/);
  assert.match(statsJs, /burned:\s*\{\s*label:\s*'운동칼로리'/);
  assert.match(statsJs, /calcBurnedKcal\(day, weightForBurn\)\.total/);
  assert.match(statsJs, /checkin\?\.bodyFatPct/);
  assert.match(statsJs, /cubicInterpolationMode:\s*'monotone'/);
  assert.match(statsJs, /borderCapStyle:\s*'round'/);
  assert.match(statsJs, /borderJoinStyle:\s*'round'/);
  assert.match(statsJs, /tension:\s*0\.45/);
  assert.match(statsJs, /pointRadius:\s*2/);
  assert.match(statsJs, /_healthChartPeriod === 0/);
  assert.match(statsJs, /_statsNodes\(scope, '\[data-health-period\]'\)/);
  assert.doesNotMatch(statsJs, /\[data-health-series\]/);
  assert.doesNotMatch(statsJs, /let _healthMetricsChart = null/);
  assert.doesNotMatch(statsJs, /position:\s*'right'/);
  assert.doesNotMatch(statsJs, /function _renderCalorieReport/);
  assert.doesNotMatch(statsJs, /function _renderCheckinChart/);
  assert.doesNotMatch(statsJs, /_renderCalorieReport\(\)/);
  assert.doesNotMatch(statsJs, /_renderCheckinChart\(\)/);
});

test('stats health chart cards are styled and cache version is bumped', () => {
  assert.match(styleCss, /\.stats-health-controls/);
  assert.match(styleCss, /\.stats-health-curves/);
  assert.match(styleCss, /\.stats-health-curve-card/);
  assert.match(styleCss, /\.stats-health-curve-chart/);
  assert.doesNotMatch(styleCss, /\.stats-health-toggle/);
  assert.match(styleCss, /\.stats-health-period\.active/);
  assert.match(swJs, /tomatofarm-v20260629z16-stats-priority-health-curves/);
});
