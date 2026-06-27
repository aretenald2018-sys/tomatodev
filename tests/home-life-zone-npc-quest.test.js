import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('life zone trainer hook is rendered without the old NPC card image', () => {
  const source = readText('home/life-zone.js');

  assert.match(source, /const LIFE_ZONE_NPC_NAME = '트레이너'/);
  assert.doesNotMatch(source, /LIFE_ZONE_UI_ROOT/);
  assert.doesNotMatch(source, /npc-quest-bubble\.png/);
  assert.match(source, /data-lz-action="npc-quest"/);
  assert.match(source, /class="lz-nameplate lz-nameplate--npc"/);
  assert.match(source, /aria-label="트레이너 퀘스트 보기"/);
  assert.match(source, /title="트레이너 퀘스트"/);
  assert.match(source, /addEventListener\('click'/);
  assert.match(source, /life-zone:npc-quest/);
  assert.match(source, /detail: \{ npc: 'trainer' \}/);
});

test('life zone actor nameplates are rendered as text under sprites', () => {
  const source = readText('home/life-zone.js');

  assert.match(source, /function _applyActorNameplatePosition/);
  assert.match(source, /const LIFE_ZONE_SPRITE_HEIGHT_RATIO = Object\.freeze/);
  assert.match(source, /function _getActorSpriteHeight/);
  assert.match(source, /const x = Number\(slot\.x\) \+ Number\(slot\.width\) \* 0\.5/);
  assert.match(source, /const y = Number\(slot\.labelY\) \|\| \(Number\(slot\.y\) \+ _getActorSpriteHeight\(slot\) \+ 12\)/);
  assert.match(source, /document\.createElement\('span'\)/);
  assert.match(source, /nameplate\.className = `lz-nameplate lz-nameplate--actor lz-nameplate--\$\{actor\.state\}`/);
  assert.match(source, /nameplate\.textContent = actor\.displayName/);
  assert.match(source, /_applyActorNameplatePosition\(nameplate, slot\)/);
});

test('life zone NPC quest bubble has a stable clickable overlay style', () => {
  const css = readText('style.css');

  assert.match(css, /\.lz-npc-quest \{/);
  assert.match(css, /left: calc\(1058 \/ 1672 \* 100%\)/);
  assert.match(css, /top: calc\(932 \/ 1672 \* 100%\)/);
  assert.match(css, /min-width: 44px/);
  assert.match(css, /min-height: 18px/);
  assert.match(css, /pointer-events: auto/);
  assert.match(css, /touch-action: manipulation/);
  assert.match(css, /\.lz-npc-quest:focus-visible/);
  assert.match(css, /\.lz-npc-quest \.lz-nameplate/);
  assert.match(css, /position: static/);
  assert.match(css, /overflow: visible/);
  assert.doesNotMatch(css, /\.lz-npc-quest img/);
});

test('life zone nameplates use small pixel text with outline shadows', () => {
  const css = readText('style.css');

  assert.match(css, /\.lz-nameplate \{/);
  assert.match(css, /font-size: 9px/);
  assert.match(css, /letter-spacing: 0/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /transform: translate\(-50%, 0\)/);
  assert.match(css, /text-shadow:/);
  assert.match(css, /\.lz-nameplate--npc \{\s*color: #ffe15a;/);
  assert.match(css, /@media \(max-width: 420px\) \{\s*\.lz-nameplate \{[\s\S]*font-size: 8px/);
});

test('life zone NPC card image is no longer a precached runtime asset', () => {
  const sw = readText('sw.js');

  assert.match(sw, /tomatofarm-v20260627z7-workout-sheet-tap-toggle/);
  assert.doesNotMatch(sw, /\.\/assets\/home\/life-zone\/ui\/npc-quest-bubble\.png/);
});
