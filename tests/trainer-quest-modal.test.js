import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');
const modalManagerJs = readFileSync('modal-manager.js', 'utf8');
const modalJs = readFileSync('modals/trainer-quest-modal.js', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('trainer quest modal renders Maple-like sections with TDS actions', () => {
  assert.match(modalJs, /id="trainer-quest-modal"/);
  assert.match(modalJs, /무엇을 도와드릴까요\?/);
  assert.match(modalJs, /완료가능한 퀘스트/);
  assert.match(modalJs, /업데이트 예정/);
  assert.match(modalJs, /기타/);
  assert.match(modalJs, /내 운동 통계 살펴보기/);
  assert.match(modalJs, /data-trainer-quest-action="stats"/);
  assert.match(modalJs, /data-trainer-quest-character/);
  assert.match(modalJs, /assets\/home\/life-zone\/ui\/trainer-quest-seated-trainer\.png/);
  assert.doesNotMatch(modalJs, /onclick=/);
  assert.match(modalJs, /openTrainerQuestModal/);
  assert.match(modalJs, /closeTrainerQuestModal/);
});

test('life zone trainer quest event opens the injected modal', () => {
  assert.match(modalManagerJs, /trainer-quest-modal/);
  assert.match(modalManagerJs, /\.\/modals\/trainer-quest-modal\.js/);
  assert.match(appJs, /document\.addEventListener\('life-zone:npc-quest'/);
  assert.match(appJs, /event\?\.detail\?\.npc !== 'trainer'/);
  assert.match(appJs, /await loadAndInjectModals\(\)/);
  assert.match(appJs, /window\.openTrainerQuestModal\(\)/);
});

test('trainer quest stats render reuses stats tab data in a scoped modal root', () => {
  assert.match(modalJs, /import\('\.\.\/render-stats\.js'\)/);
  assert.match(modalJs, /renderTrainerQuestStats\(root\)/);
  assert.match(statsJs, /export function renderTrainerQuestStats\(root\)/);
  assert.match(statsJs, /data-stats-id="stats-overall-summary"/);
  assert.match(statsJs, /data-stats-id="health-metrics-chart"/);
  assert.match(statsJs, /data-stats-id="stats-muscle-fatigue"/);
  assert.match(statsJs, /data-stats-id="volume-section"/);
  assert.match(statsJs, /data-stats-id="deep-stats-report"/);
  assert.match(statsJs, /function _statsNode\(root, id\)/);
  assert.match(statsJs, /const _healthMetricsCharts = new WeakMap\(\)/);
});

test('trainer quest modal styles and runtime cache asset are registered', () => {
  assert.match(styleCss, /\.trainer-quest-sheet/);
  assert.match(styleCss, /\.trainer-quest-seated-character/);
  assert.match(styleCss, /position:\s*absolute/);
  assert.match(styleCss, /pointer-events:\s*none/);
  assert.match(styleCss, /\.trainer-quest-row-btn/);
  assert.match(styleCss, /\.trainer-quest-stats-root/);
  assert.match(swJs, /tomatofarm-v20260628z9-trainer-modal-seated-character/);
  assert.match(swJs, /\.\/modals\/trainer-quest-modal\.js/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/ui\/trainer-quest-seated-trainer\.png/);
});
