import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appJs = readFileSync('app.js', 'utf8');
const modalManagerJs = readFileSync('modal-manager.js', 'utf8');
const modalJs = readFileSync('modals/miranda-quest-modal.js', 'utf8');
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

test('Miranda quest modal renders a seated NPC dialogue sheet', () => {
  assert.match(modalJs, /id="miranda-quest-modal"/);
  assert.match(modalJs, /무엇을 원하죠\?/);
  assert.match(modalJs, /trainer-quest-modal miranda-quest-modal/);
  assert.match(modalJs, /trainer-quest-sheet miranda-quest-sheet/);
  assert.match(modalJs, /data-miranda-quest-character/);
  assert.match(modalJs, /data-miranda-quest-speech/);
  assert.match(modalJs, /data-miranda-quest-game-menu/);
  assert.match(modalJs, /data-miranda-quest-action="close"/);
  assert.match(modalJs, /미란다의 업무 지시를 받습니다\(향후 구현예정\)/);
  assert.match(modalJs, /trainer-quest-seated-character--miranda/);
  assert.match(modalJs, /assets\/home\/life-zone\/ui\/miranda-npc-seated\.png/);
  assert.doesNotMatch(modalJs, /onclick=/);
  assert.match(modalJs, /openMirandaQuestModal/);
  assert.match(modalJs, /closeMirandaQuestModal/);
});

test('Miranda quest modal uses its own slower typing and direct bindings', () => {
  assert.match(modalJs, /const MIRANDA_QUEST_TYPE_MS = 64/);
  assert.match(modalJs, /function _startSpeechTyping\(modal\)/);
  assert.match(modalJs, /speech\.classList\.add\('is-typing'\)/);
  assert.match(modalJs, /value\.textContent = text\.slice\(0, index\)/);
  assert.match(modalJs, /modal\.querySelector\('\.miranda-quest-sheet'\)\?\.addEventListener\('click', event => event\.stopPropagation\(\)\)/);
  assert.match(modalJs, /modal\.querySelector\('\[data-miranda-quest-action="close"\]'\)\?\.addEventListener\('click', closeMirandaQuestModal\)/);
});

test('Miranda quest modal is injected and opened by the life zone NPC event', () => {
  assert.match(modalManagerJs, /miranda-quest-modal/);
  assert.match(modalManagerJs, /\.\/modals\/miranda-quest-modal\.js/);
  assert.match(appJs, /miranda: \{/);
  assert.match(appJs, /opener: 'openMirandaQuestModal'/);
  assert.match(appJs, /label: '미란다'/);
});

test('Miranda modal styles and runtime assets are registered', () => {
  assert.match(styleCss, /\.trainer-quest-seated-character--miranda \{/);
  assert.match(styleCss, /width: clamp\(130px, 36vw, 178px\)/);
  assert.match(styleCss, /\.lz-miranda-npc \{/);
  assert.match(styleCss, /\.lz-miranda-npc \.lz-npc-bulb \{/);
  assert.match(styleCss, /\.lz-miranda-npc \.lz-npc-bulb,\s*\.lz-consulting-chief-npc \.lz-npc-bulb\s*\{[\s\S]*display: none;/);
  assert.match(swJs, /tomatofarm-v20260701z2-home-hero-life-zone-balance/);
  assert.match(swJs, /\.\/modals\/miranda-quest-modal\.js/);
  assert.match(swJs, /\.\/assets\/home\/life-zone\/ui\/miranda-npc-seated\.png/);
  assert.deepEqual(readPngHeader('assets/home/life-zone/ui/miranda-npc-seated.png'), {
    width: 982,
    height: 1601,
    colorType: 6
  });
});
