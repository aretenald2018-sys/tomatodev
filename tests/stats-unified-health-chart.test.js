import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('stats renders one unified health chart with checkbox filters and period controls', () => {
  assert.match(indexHtml, /id="health-metrics-chart"/);
  assert.match(indexHtml, /data-health-series="weight"/);
  assert.match(indexHtml, /data-health-series="bodyFat"/);
  assert.match(indexHtml, /data-health-series="intake"/);
  assert.match(indexHtml, /data-health-series="burned"/);
  assert.match(indexHtml, /data-health-period="30"/);
  assert.match(indexHtml, /data-health-period="60"/);
  assert.match(indexHtml, /data-health-period="90"/);
  assert.match(indexHtml, /data-health-period="all"/);
  assert.doesNotMatch(indexHtml, /id="calorie-month-chart"/);
  assert.doesNotMatch(indexHtml, /id="checkin-chart"/);
});

test('stats health chart combines body, intake, and exercise series in one Chart.js instance', () => {
  assert.match(statsJs, /let _healthMetricsChart = null/);
  assert.match(statsJs, /function _renderHealthMetricsChart/);
  assert.match(statsJs, /HEALTH_CHART_SERIES/);
  assert.match(statsJs, /bodyFat:\s*\{\s*label:\s*'체지방률'/);
  assert.match(statsJs, /burned:\s*\{\s*label:\s*'운동칼로리'/);
  assert.match(statsJs, /calcBurnedKcal\(day, weightForBurn\)\.total/);
  assert.match(statsJs, /checkin\?\.bodyFatPct/);
  assert.match(statsJs, /_healthChartPeriod === 0/);
  assert.match(statsJs, /document\.querySelectorAll\('\[data-health-series\]'\)/);
  assert.match(statsJs, /document\.querySelectorAll\('\[data-health-period\]'\)/);
  assert.doesNotMatch(statsJs, /function _renderCalorieReport/);
  assert.doesNotMatch(statsJs, /function _renderCheckinChart/);
  assert.doesNotMatch(statsJs, /_renderCalorieReport\(\)/);
  assert.doesNotMatch(statsJs, /_renderCheckinChart\(\)/);
});

test('stats health chart controls are styled and cache version is bumped', () => {
  assert.match(styleCss, /\.stats-health-controls/);
  assert.match(styleCss, /\.stats-health-toggle/);
  assert.match(styleCss, /\.stats-health-period\.active/);
  assert.match(swJs, /tomatofarm-v20260628z4-running-vworld-map/);
});
