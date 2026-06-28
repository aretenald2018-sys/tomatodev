import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');
const modalManagerJs = readFileSync('modal-manager.js', 'utf8');
const modalJs = readFileSync('modals/trainer-quest-modal.js', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

test('trainer quest modal renders game-like dialogue choice boxes', () => {
  assert.match(modalJs, /id="trainer-quest-modal"/);
  assert.match(modalJs, /무엇을 도와드릴까요\?/);
  assert.match(modalJs, /trainer-quest-menu/);
  assert.match(modalJs, /trainer-quest-choice/);
  assert.match(modalJs, /퀘스트를 수락합니다\(향후 구현예정\)/);
  assert.match(modalJs, /내 운동 통계 살펴보기/);
  assert.match(modalJs, /<span>닫기<\/span>/);
  assert.match(modalJs, /trainer-quest-choice-caret/);
  assert.match(modalJs, /data-trainer-quest-action="stats"/);
  assert.match(modalJs, /data-trainer-quest-action="close"/);
  assert.match(modalJs, /data-trainer-quest-character/);
  assert.match(modalJs, /data-trainer-quest-speech-text="\$\{TRAINER_QUEST_SPEECH_TEXT\}"/);
  assert.match(modalJs, /data-trainer-quest-speech-value/);
  assert.match(modalJs, /trainer-quest-type-cursor/);
  assert.doesNotMatch(modalJs, /trainer-quest-head/);
  assert.doesNotMatch(modalJs, /trainer-quest-portrait/);
  assert.doesNotMatch(modalJs, /data-trainer-quest-close/);
  assert.doesNotMatch(modalJs, /trainer-quest-section/);
  assert.doesNotMatch(modalJs, /trainer-quest-row/);
  assert.doesNotMatch(modalJs, /완료가능한 퀘스트/);
  assert.doesNotMatch(modalJs, /업데이트 예정/);
  assert.match(modalJs, /assets\/home\/life-zone\/ui\/trainer-quest-seated-trainer\.png/);
  assert.doesNotMatch(modalJs, /onclick=/);
  assert.match(modalJs, /openTrainerQuestModal/);
  assert.match(modalJs, /closeTrainerQuestModal/);
});

test('trainer quest speech uses a fast NPC typing effect on open', () => {
  assert.match(modalJs, /const TRAINER_QUEST_TYPE_MS = 28/);
  assert.match(modalJs, /let _speechTypingTimer = null/);
  assert.match(modalJs, /function _startSpeechTyping\(modal\)/);
  assert.match(modalJs, /value\.textContent = text\.slice\(0, index\)/);
  assert.match(modalJs, /speech\.classList\.add\('is-typing'\)/);
  assert.match(modalJs, /speech\.classList\.remove\('is-typing'\)/);
  assert.match(modalJs, /_startSpeechTyping\(modal\)/);
  assert.match(modalJs, /_stopSpeechTyping\(\)/);
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

test('trainer quest stats can be shared or copied as JSON export data', () => {
  assert.match(modalJs, /data-trainer-quest-export="share"/);
  assert.match(modalJs, /data-trainer-quest-export="copy"/);
  assert.match(modalJs, /navigator\.share/);
  assert.match(modalJs, /navigator\.clipboard\?\.writeText/);
  assert.match(modalJs, /buildTrainerQuestStatsExportText/);
  assert.match(statsJs, /export function buildTrainerQuestStatsExport\(\)/);
  assert.match(statsJs, /schema: 'tomatofarm\.trainerStats\.v1'/);
  assert.match(statsJs, /healthChart/);
  assert.match(statsJs, /muscleFatigue/);
  assert.match(statsJs, /trainerAnalysis/);
});

test('trainer quest modal styles and runtime cache asset are registered', () => {
  assert.match(styleCss, /\.trainer-quest-sheet/);
  assert.match(styleCss, /\.trainer-quest-stage/);
  assert.match(styleCss, /\.trainer-quest-speech::after/);
  assert.match(styleCss, /\.trainer-quest-type-cursor/);
  assert.match(styleCss, /@keyframes trainer-quest-type-cursor-blink/);
  assert.match(styleCss, /\.trainer-quest-seated-character/);
  assert.match(styleCss, /position:\s*absolute/);
  assert.match(styleCss, /pointer-events:\s*none/);
  assert.match(styleCss, /top:\s*clamp\(-250px,\s*-58vw,\s*-198px\)/);
  assert.match(styleCss, /padding:\s*clamp\(148px,\s*33vw,\s*184px\)/);
  assert.match(styleCss, /\.trainer-quest-menu/);
  assert.match(styleCss, /\.trainer-quest-choice/);
  assert.match(styleCss, /rgba\(44, 58, 72, \.92\)/);
  assert.match(styleCss, /border-radius:\s*4px/);
  assert.match(styleCss, /\.trainer-quest-choice-caret/);
  assert.match(styleCss, /\.trainer-quest-export-actions/);
  assert.match(styleCss, /\.trainer-quest-export-btn svg/);
  assert.doesNotMatch(styleCss, /\.trainer-quest-section/);
  assert.doesNotMatch(styleCss, /\.trainer-quest-row-btn/);
  assert.match(styleCss, /\.trainer-quest-stats-root/);
  assert.match(swJs, /tomatofarm-v20260628z13-trainer-game-export/);
  assert.match(swJs, /\.\/modals\/trainer-quest-modal\.js/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/ui\/trainer-quest-seated-trainer\.png/);
});
