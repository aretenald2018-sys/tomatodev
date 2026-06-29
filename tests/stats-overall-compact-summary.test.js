import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('overall stats uses one compact summary instead of duplicated aggregation cards', () => {
  assert.match(indexHtml, /class="stats-block stats-summary-block"/);
  assert.match(indexHtml, /id="stats-overall-summary"/);
  assert.doesNotMatch(indexHtml, /id="stats-metadata-summary"/);
  assert.doesNotMatch(indexHtml, /id="muscle-14d"/);
  assert.doesNotMatch(indexHtml, /id="muscle-period"/);
  assert.doesNotMatch(indexHtml, /id="diet-stats"/);
  assert.doesNotMatch(indexHtml, /id="monthly-summary"/);
  assert.doesNotMatch(indexHtml, /부위별 운동 비중/);
  assert.doesNotMatch(indexHtml, /기간별 운동 횟수/);
  assert.doesNotMatch(indexHtml, /식단 달성 단계/);
  assert.doesNotMatch(indexHtml, /월별 운동 일수/);
});

test('overall summary renderer replaces legacy aggregate renderers', () => {
  assert.match(statsJs, /function _renderOverallSummary/);
  assert.match(statsJs, /_renderOverallSummary\(root\)/);
  assert.match(statsJs, /hasDietRecord\(ny,m,d\)/);
  assert.match(statsJs, /stats-summary-kpi/);
  assert.match(statsJs, /stats-summary-fact/);
  assert.doesNotMatch(statsJs, /function _renderOverallMetadata/);
  assert.doesNotMatch(statsJs, /function _renderMuscle14d/);
  assert.doesNotMatch(statsJs, /function _renderMusclePeriod/);
  assert.doesNotMatch(statsJs, /function _renderDietStats/);
  assert.doesNotMatch(statsJs, /function _renderMonthlySummary/);
  assert.doesNotMatch(statsJs, /_renderMuscle14d\(\)/);
  assert.doesNotMatch(statsJs, /_renderMusclePeriod\(\)/);
  assert.doesNotMatch(statsJs, /_renderDietStats\(\)/);
  assert.doesNotMatch(statsJs, /_renderMonthlySummary\(\)/);
});

test('trainer quest stats export exposes JSON data for AI sharing', () => {
  assert.match(statsJs, /export function buildTrainerQuestStatsExport\(\)/);
  assert.match(statsJs, /schema: 'tomatofarm\.trainerStats\.v1'/);
  assert.match(statsJs, /buildTrainerQuestStatsExportText/);
  assert.match(statsJs, /JSON\.stringify\(buildTrainerQuestStatsExport\(\), null, 2\)/);
  assert.match(statsJs, /healthChart/);
  assert.match(statsJs, /muscleFatigue/);
  assert.match(statsJs, /trainerAnalysis/);
});

test('compact summary styles are present and cache version is bumped', () => {
  assert.match(styleCss, /\.stats-summary-kpis/);
  assert.match(styleCss, /\.stats-summary-fact/);
  assert.match(styleCss, /\.stats-summary-kpi\.is-good/);
  assert.match(swJs, /tomatofarm-v20260629z8-home-running-motion-map-clarity/);
});
