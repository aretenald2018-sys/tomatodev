import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');
const modalManagerJs = readFileSync('modal-manager.js', 'utf8');
const modalJs = readFileSync('modals/consulting-chief-quest-modal.js', 'utf8');
const styleCss = readFileSync('style.css', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

function readPngHeader(relativePath) {
  const buffer = readFileSync(relativePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25)
  };
}

test('consulting chief quest modal renders a dedicated NPC dialogue sheet', () => {
  assert.match(modalJs, /id="consulting-chief-quest-modal"/);
  assert.match(modalJs, /원하는 스타일 있으실까요\?/);
  assert.match(modalJs, /trainer-quest-modal consulting-chief-quest-modal/);
  assert.match(modalJs, /trainer-quest-sheet consulting-chief-quest-sheet/);
  assert.match(modalJs, /data-consulting-chief-quest-character/);
  assert.match(modalJs, /data-consulting-chief-quest-speech/);
  assert.match(modalJs, /data-consulting-chief-quest-game-menu/);
  assert.match(modalJs, /data-consulting-chief-quest-action="close"/);
  assert.match(modalJs, /상담실장 상담을 예약합니다\(향후 구현예정\)/);
  assert.match(modalJs, /trainer-quest-seated-character--consulting-chief/);
  assert.match(modalJs, /assets\/home\/life-zone\/ui\/consulting-chief-npc-modal\.png/);
  assert.doesNotMatch(modalJs, /onclick=/);
  assert.match(modalJs, /openConsultingChiefQuestModal/);
  assert.match(modalJs, /closeConsultingChiefQuestModal/);
});

test('consulting chief quest modal uses direct sheet bindings', () => {
  assert.match(modalJs, /const CONSULTING_CHIEF_QUEST_TYPE_MS = 60/);
  assert.match(modalJs, /function _startSpeechTyping\(modal\)/);
  assert.match(modalJs, /speech\.classList\.add\('is-typing'\)/);
  assert.match(modalJs, /value\.textContent = text\.slice\(0, index\)/);
  assert.match(modalJs, /modal\.querySelector\('\.consulting-chief-quest-sheet'\)\?\.addEventListener\('click', event => event\.stopPropagation\(\)\)/);
  assert.match(modalJs, /modal\.querySelector\('\[data-consulting-chief-quest-action="close"\]'\)\?\.addEventListener\('click', closeConsultingChiefQuestModal\)/);
});

test('consulting chief modal is injected and opened by the life zone NPC event', () => {
  assert.match(modalManagerJs, /consulting-chief-quest-modal/);
  assert.match(modalManagerJs, /\.\/modals\/consulting-chief-quest-modal\.js/);
  assert.match(appJs, /consultingChief: \{/);
  assert.match(appJs, /opener: 'openConsultingChiefQuestModal'/);
  assert.match(appJs, /label: '상담실장'/);
});

test('consulting chief modal styles and runtime assets are registered', () => {
  assert.match(styleCss, /\.trainer-quest-seated-character--consulting-chief \{/);
  assert.match(styleCss, /width: clamp\(176px, 50vw, 252px\)/);
  assert.match(styleCss, /\.lz-consulting-chief-npc \{/);
  assert.match(styleCss, /\.lz-consulting-chief-npc \.lz-npc-bulb \{/);
  assert.match(swJs, /tomatofarm-v20260630z02-workout-calendar-scroll/);
  assert.match(swJs, /\.\/modals\/consulting-chief-quest-modal\.js/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/ui\/consulting-chief-npc-modal\.png/);
  assert.deepEqual(readPngHeader('assets/home/life-zone/ui/consulting-chief-npc-modal.png'), {
    width: 1074,
    height: 1485,
    colorType: 6
  });
});
