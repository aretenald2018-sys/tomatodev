import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('stats renders health metrics as one integrated graph driven by the top period controls', () => {
  assert.match(indexHtml, /id="health-metrics-chart"/);
  assert.match(indexHtml, /id="health-metrics-legend"/);
  assert.match(indexHtml, /data-stats-analysis-period="week"/);
  assert.doesNotMatch(indexHtml, /id="health-metrics-charts"/);
  assert.doesNotMatch(indexHtml, /class="stats-health-curves"/);
  assert.doesNotMatch(indexHtml, /data-health-period=/);
  assert.doesNotMatch(indexHtml, /data-health-series=/);
  assert.doesNotMatch(indexHtml, /id="calorie-month-chart"/);
  assert.doesNotMatch(indexHtml, /id="checkin-chart"/);
});

test('stats health chart renders thin normalized lines on one Chart.js canvas', () => {
  assert.match(statsJs, /function _renderHealthMetricsChart/);
  assert.match(statsJs, /const _healthMetricsCharts = new WeakMap\(\)/);
  assert.match(statsJs, /HEALTH_CHART_SERIES/);
  assert.match(statsJs, /function _healthChartSeriesWithData/);
  assert.match(statsJs, /function _normalizeHealthValues/);
  assert.match(statsJs, /function _sampleHealthKeys/);
  assert.match(statsJs, /datasets:\s*visibleKeys\.map\(key => _healthDataset\(key, data\[key\]\)\)/);
  assert.match(statsJs, /bodyFat:\s*\{\s*label:\s*'체지방률'/);
  assert.match(statsJs, /burned:\s*\{\s*label:\s*'운동칼로리'/);
  assert.match(statsJs, /calcBurnedKcal\(day, weightForBurn\)\.total/);
  assert.match(statsJs, /checkin\?\.bodyFatPct/);
  assert.match(statsJs, /cubicInterpolationMode:\s*'monotone'/);
  assert.match(statsJs, /borderCapStyle:\s*'round'/);
  assert.match(statsJs, /borderJoinStyle:\s*'round'/);
  assert.match(statsJs, /borderWidth:\s*1\.35/);
  assert.match(statsJs, /pointRadius:\s*0/);
  assert.match(statsJs, /maxTicksLimit:\s*5/);
  assert.match(statsJs, /metaEl\.textContent[\s\S]*통합 그래프/);
  assert.doesNotMatch(statsJs, /function _drawHealthCurveChart/);
  assert.doesNotMatch(statsJs, /_healthChartPeriod/);
  assert.doesNotMatch(statsJs, /\[data-health-period\]/);
  assert.doesNotMatch(statsJs, /\[data-health-series\]/);
  assert.doesNotMatch(statsJs, /let _healthMetricsChart = null/);
  assert.doesNotMatch(statsJs, /position:\s*'right'/);
  assert.doesNotMatch(statsJs, /function _renderCalorieReport/);
  assert.doesNotMatch(statsJs, /function _renderCheckinChart/);
  assert.doesNotMatch(statsJs, /_renderCalorieReport\(\)/);
  assert.doesNotMatch(statsJs, /_renderCheckinChart\(\)/);
});

test('stats health chart and legend are styled and cache version is bumped', () => {
  assert.match(styleCss, /\.stats-health-legend/);
  assert.match(styleCss, /\.stats-health-legend-chip/);
  assert.match(styleCss, /\.stats-health-chart-wrap/);
  assert.doesNotMatch(styleCss, /\.stats-health-toggle/);
  assert.doesNotMatch(styleCss, /\.stats-health-curves/);
  assert.doesNotMatch(styleCss, /\.stats-health-period/);
  assert.match(swJs, /tomatofarm-v20260629z17-stats-week-performance-health/);
});
