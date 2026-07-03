import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');
const modalManagerJs = readFileSync('modal-manager.js', 'utf8');
const modalJs = readFileSync('modals/trainer-quest-modal.js', 'utf8');
const statsJs = readFileSync('render-stats.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

function readPngHeader(relativePath) {
  const buffer = readFileSync(relativePath);
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25)
  };
}

test('trainer quest modal renders game-like dialogue choice boxes', () => {
  assert.match(modalJs, /id="trainer-quest-modal"/);
  assert.match(modalJs, /회원님의 운동 성과를 함께 살펴보시죠!/);
  assert.match(modalJs, /trainer-quest-game-menu/);
  assert.match(modalJs, /data-trainer-quest-game-menu/);
  assert.match(modalJs, /trainer-quest-game-option/);
  assert.match(modalJs, /퀘스트를 수락합니다\(향후 구현예정\)/);
  assert.match(modalJs, /내 운동 통계 살펴보기/);
  assert.match(modalJs, /trainer-quest-game-label">닫기<\/span>/);
  assert.match(modalJs, /trainer-quest-game-marker/);
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
  assert.doesNotMatch(modalJs, /trainer-quest-menu/);
  assert.doesNotMatch(modalJs, /trainer-quest-choice/);
  assert.doesNotMatch(modalJs, /trainer-quest-choice-caret/);
  assert.doesNotMatch(modalJs, /완료가능한 퀘스트/);
  assert.doesNotMatch(modalJs, /업데이트 예정/);
  assert.match(modalJs, /assets\/home\/life-zone\/ui\/trainer-quest-seated-trainer\.png/);
  assert.match(modalJs, /trainer-quest-stats-guide-character/);
  assert.match(modalJs, /trainer-quest-stats-guide-speech/);
  assert.match(modalJs, /trainer-quest-stats-title-row/);
  assert.match(modalJs, /assets\/home\/life-zone\/ui\/trainer-quest-stats-guide-trainer\.png/);
  assert.match(modalJs, /classList\.add\('trainer-quest-sheet--stats'\)/);
  assert.match(modalJs, /classList\.remove\('trainer-quest-sheet--stats'\)/);
  assert.doesNotMatch(modalJs, /onclick=/);
  assert.match(modalJs, /openTrainerQuestModal/);
  assert.match(modalJs, /closeTrainerQuestModal/);
});

test('trainer quest speech uses a slower NPC typing effect on open', () => {
  assert.match(modalJs, /const TRAINER_QUEST_TYPE_MS = 56/);
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
  assert.match(modalManagerJs, /miranda-quest-modal/);
  assert.match(modalManagerJs, /\.\/modals\/miranda-quest-modal\.js/);
  assert.match(appJs, /document\.addEventListener\('life-zone:npc-quest'/);
  assert.match(appJs, /const modalByNpc = \{/);
  assert.match(appJs, /trainer: \{/);
  assert.match(appJs, /opener: 'openTrainerQuestModal'/);
  assert.match(appJs, /miranda: \{/);
  assert.match(appJs, /opener: 'openMirandaQuestModal'/);
  assert.match(appJs, /await loadAndInjectModals\(\)/);
  assert.match(appJs, /const opener = window\[modalConfig\.opener\]/);
  assert.match(appJs, /opener\(\)/);
});

test('trainer quest stats render reuses stats tab data in a scoped modal root', () => {
  assert.match(modalJs, /import\('\.\.\/render-stats\.js'\)/);
  assert.match(modalJs, /renderTrainerQuestStats\(root\)/);
  assert.match(statsJs, /export function renderTrainerQuestStats\(root\)/);
  assert.match(statsJs, /data-stats-id="stats-overall-summary"/);
  assert.match(statsJs, /data-stats-id="stats-workout-analysis"/);
  assert.match(statsJs, /data-stats-id="kcal-weight-chart"/);
  assert.match(statsJs, /data-stats-id="kcal-weight-meta"/);
  assert.match(statsJs, /data-stats-id="calorie-month-summary"/);
  assert.match(statsJs, /data-stats-id="exercise-performance-section"/);
  assert.match(statsJs, /data-stats-id="stats-muscle-fatigue"/);
  assert.match(statsJs, /data-stats-id="volume-section"/);
  assert.match(statsJs, /stats-muscle-fatigue-block[\s\S]*stats-summary-block[\s\S]*stats-workout-analysis-block[\s\S]*stats-health-block[\s\S]*stats-health-report[\s\S]*calorie-month-summary[\s\S]*stats-performance-block/);
  assert.doesNotMatch(statsJs, /data-stats-id="calorie-month-chart"/);
  assert.doesNotMatch(statsJs, /stats-calorie-report-block/);
  assert.doesNotMatch(statsJs, /data-stats-id="deep-stats-report"/);
  assert.doesNotMatch(statsJs, /trainer-quest-deep-stats/);
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
  assert.match(statsJs, /workoutAnalysis/);
});

test('trainer quest modal styles and runtime cache asset are registered', () => {
  assert.match(styleCss, /\.trainer-quest-sheet/);
  assert.match(styleCss, /\.trainer-quest-stage/);
  assert.match(styleCss, /\.trainer-quest-modal/);
  assert.match(styleCss, /background:\s*rgba\(8, 13, 20, \.28\)/);
  assert.match(styleCss, /backdrop-filter:\s*blur\(10px\) saturate\(1\.12\)/);
  assert.match(styleCss, /\.trainer-quest-speech::after/);
  assert.match(styleCss, /\.trainer-quest-type-cursor/);
  assert.match(styleCss, /@keyframes trainer-quest-type-cursor-blink/);
  assert.match(styleCss, /\.trainer-quest-seated-character/);
  assert.match(styleCss, /position:\s*absolute/);
  assert.match(styleCss, /pointer-events:\s*none/);
  assert.match(styleCss, /top:\s*clamp\(-250px,\s*-58vw,\s*-198px\)/);
  assert.match(styleCss, /padding:\s*clamp\(148px,\s*33vw,\s*184px\)/);
  assert.match(styleCss, /\.trainer-quest-sheet\.trainer-quest-sheet--stats \{[\s\S]*padding:\s*14px 16px 18px;/);
  assert.match(styleCss, /\.trainer-quest-sheet\.trainer-quest-sheet--stats \.trainer-quest-stage \{[\s\S]*display:\s*none;/);
  assert.match(styleCss, /\.trainer-quest-stats-guide-character \{[\s\S]*right:\s*clamp\(-18px,\s*-1vw,\s*4px\);[\s\S]*top:\s*clamp\(-252px,\s*-58vw,\s*-214px\);[\s\S]*width:\s*clamp\(170px,\s*41vw,\s*222px\);[\s\S]*height:\s*clamp\(216px,\s*54vw,\s*286px\);[\s\S]*overflow:\s*hidden;/);
  assert.match(styleCss, /\.trainer-quest-stats-guide-speech::after/);
  assert.match(styleCss, /\.trainer-quest-stats-title-row/);
  assert.match(styleCss, /\.trainer-quest-sheet--stats \.trainer-quest-stats \{[\s\S]*padding-top:\s*0;/);
  assert.match(styleCss, /rgba\(255, 255, 255, \.58\)/);
  assert.match(styleCss, /rgba\(255, 255, 255, \.32\)/);
  assert.match(styleCss, /border:\s*1px solid rgba\(255, 255, 255, \.38\)/);
  assert.match(styleCss, /backdrop-filter:\s*blur\(24px\) saturate\(1\.35\)/);
  assert.doesNotMatch(styleCss, /rgba\(203, 208, 216, \.84\)/);
  assert.doesNotMatch(styleCss, /rgba\(213, 217, 224, \.86\)/);
  assert.match(styleCss, /\.trainer-quest-game-menu/);
  assert.match(styleCss, /width:\s*min\(236px,\s*calc\(50vw - 12px\)\)/);
  assert.match(styleCss, /margin:\s*8px 0 0 clamp\(14px,\s*4vw,\s*22px\)/);
  assert.match(styleCss, /background:\s*transparent/);
  assert.match(styleCss, /box-shadow:\s*none/);
  assert.doesNotMatch(styleCss, /rgba\(59, 75, 92, \.98\)/);
  assert.doesNotMatch(styleCss, /rgba\(18, 29, 42, \.98\)/);
  assert.match(styleCss, /\.trainer-quest-game-option/);
  assert.match(styleCss, /min-height:\s*34px/);
  assert.match(styleCss, /padding:\s*7px 10px 7px 9px/);
  assert.match(styleCss, /border-radius:\s*18px/);
  assert.match(styleCss, /backdrop-filter:\s*blur\(12px\) saturate\(1\.18\)/);
  assert.match(styleCss, /\.trainer-quest-game-marker/);
  assert.match(styleCss, /\.trainer-quest-game-label/);
  assert.match(styleCss, /font-family:\s*var\(--font-sans\)/);
  assert.match(styleCss, /font-size:\s*var\(--tds-st13-size, 12px\)/);
  assert.match(styleCss, /font-weight:\s*var\(--tds-w-semi, 600\)/);
  assert.match(styleCss, /text-shadow:\s*none/);
  assert.match(styleCss, /\.trainer-quest-export-actions/);
  assert.match(styleCss, /\.trainer-quest-export-btn svg/);
  assert.doesNotMatch(styleCss, /\.trainer-quest-section/);
  assert.doesNotMatch(styleCss, /\.trainer-quest-row-btn/);
  assert.doesNotMatch(styleCss, /\.trainer-quest-menu/);
  assert.doesNotMatch(styleCss, /\.trainer-quest-choice/);
  assert.doesNotMatch(styleCss, /\.trainer-quest-choice-caret/);
  assert.match(styleCss, /\.trainer-quest-stats-root/);
  assert.match(swJs, /tomatofarm-v20260703z12-picker-sheet-fast-path/);
  assert.match(swJs, /\.\/modals\/trainer-quest-modal\.js/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/ui\/trainer-quest-seated-trainer\.png/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/ui\/trainer-quest-stats-guide-trainer\.png/);
  assert.deepEqual(readPngHeader('assets/home/life-zone/ui/trainer-quest-stats-guide-trainer.png'), {
    width: 1024,
    height: 1536,
    colorType: 6
  });
});
