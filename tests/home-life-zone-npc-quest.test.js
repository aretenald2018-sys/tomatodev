import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readPngHeader(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25)
  };
}

test('life zone trainer hook keeps the bulb bubble while hiding the old NPC card area', () => {
  const source = readText('home/life-zone.js');

  assert.match(source, /const LIFE_ZONE_NPC_NAME = '트레이너'/);
  assert.match(source, /LIFE_ZONE_UI_ROOT/);
  assert.match(source, /npc-quest-bubble\.png/);
  assert.match(source, /data-lz-action="npc-quest"/);
  assert.match(source, /class="lz-npc-bulb"/);
  assert.match(source, /class="lz-nameplate lz-nameplate--npc"/);
  assert.match(source, /aria-label="트레이너 퀘스트 보기"/);
  assert.match(source, /title="트레이너 퀘스트"/);
  assert.match(source, /addEventListener\('click'/);
  assert.match(source, /life-zone:npc-quest/);
  assert.match(source, /detail: \{ npc: 'trainer' \}/);
});

test('life zone actor nameplates are rendered as text above sprites', () => {
  const source = readText('home/life-zone.js');

  assert.match(source, /function _applyActorNameplatePosition/);
  assert.match(source, /const x = Number\(slot\.x\) \+ Number\(slot\.width\) \* 0\.5/);
  assert.match(source, /const y = Number\(slot\.labelY\) \|\| Math\.max\(24, Number\(slot\.y\) - 6\)/);
  assert.match(source, /const actorElement = document\.createElement\('span'\)/);
  assert.match(source, /const poseClass = slot\.pose \? ` lz-actor--pose-\$\{slot\.pose\}` : ''/);
  assert.match(source, /actorElement\.className = `lz-actor lz-actor--\$\{actor\.state\}\$\{poseClass\}`/);
  assert.match(source, /actorElement\.style\.setProperty\('--lz-sprite-url', `url\("\$\{spriteSrc\}"\)`\)/);
  assert.match(source, /image\.className = 'lz-actor-img'/);
  assert.match(source, /document\.createElement\('span'\)/);
  assert.match(source, /nameplate\.className = `lz-nameplate lz-nameplate--actor lz-nameplate--\$\{actor\.state\}`/);
  assert.match(source, /nameplate\.textContent = actor\.displayName/);
  assert.match(source, /_applyActorNameplatePosition\(nameplate, slot\)/);
});

test('life zone NPC quest bubble has a stable clickable overlay style', () => {
  const css = readText('style.css');

  assert.match(css, /\.lz-npc-quest \{/);
  assert.match(css, /left: calc\(1058 \/ 1672 \* 100%\)/);
  assert.match(css, /top: calc\(760 \/ 1672 \* 100%\)/);
  assert.match(css, /width: clamp\(52px, calc\(168 \/ 1672 \* 100%\), 76px\)/);
  assert.match(css, /display: flex/);
  assert.match(css, /min-height: 0/);
  assert.match(css, /transform: translate\(-50%, 0\)/);
  assert.match(css, /pointer-events: auto/);
  assert.match(css, /touch-action: manipulation/);
  assert.match(css, /\.lz-npc-quest:focus-visible/);
  assert.match(css, /\.lz-npc-bulb \{[\s\S]*width: 50%;[\s\S]*aspect-ratio: 192 \/ 150;[\s\S]*overflow: hidden;/);
  assert.match(css, /\.lz-npc-bulb img \{/);
  assert.match(css, /\.lz-npc-quest \.lz-nameplate/);
  assert.match(css, /position: static/);
  assert.match(css, /overflow: visible/);
});

test('life zone nameplates use small pixel text with outline shadows', () => {
  const css = readText('style.css');

  assert.match(css, /\.lz-nameplate \{/);
  assert.match(css, /font-size: 9px/);
  assert.match(css, /letter-spacing: 0/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /transform: translate\(-50%, -100%\)/);
  assert.match(css, /text-shadow:/);
  assert.match(css, /\.lz-nameplate--npc \{\s*color: #ffe15a;/);
  assert.match(css, /@media \(max-width: 420px\) \{\s*\.lz-nameplate \{[\s\S]*font-size: 8px/);
});

test('life zone workout poses use scoped motion with reduced motion fallback', () => {
  const css = readText('style.css');

  assert.match(css, /\.lz-actor--pose-workout-lat \{/);
  assert.match(css, /\.lz-actor-img \{/);
  assert.match(css, /\.lz-actor--pose-workout-lat::after \{/);
  assert.match(css, /background-image: var\(--lz-sprite-url\)/);
  assert.match(css, /clip-path: inset\(25% 4% 38% 14%\)/);
  assert.match(css, /animation: lz-workout-lat-pull 1\.35s ease-in-out infinite/);
  assert.match(css, /\.lz-actor--pose-workout-bench \{/);
  assert.match(css, /animation: lz-workout-bench-press 1\.2s ease-in-out infinite/);
  assert.match(css, /\.lz-actor--pose-workout-squat \{/);
  assert.match(css, /animation: lz-workout-squat-rep 1\.5s ease-in-out infinite/);
  assert.match(css, /@keyframes lz-workout-lat-pull/);
  assert.doesNotMatch(css, /@keyframes lz-workout-lat-pull \{[^@]*translateY/);
  assert.match(css, /@keyframes lz-workout-bench-press/);
  assert.match(css, /@keyframes lz-workout-squat-rep/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.lz-actor--pose-workout-lat::after,[\s\S]*\.lz-actor--pose-workout-bench,[\s\S]*\.lz-actor--pose-workout-squat[\s\S]*animation: none;[\s\S]*transform: none;/);
});

test('life zone NPC bulb source is a tracked transparent PNG runtime asset', () => {
  const sw = readText('sw.js');
  const header = readPngHeader('assets/home/life-zone/ui/npc-quest-bubble.png');

  assert.match(sw, /tomatofarm-v20260628z1-running-real-map/);
  assert.match(sw, /\.\/assets\/home\/life-zone\/ui\/npc-quest-bubble\.png/);
  assert.deepEqual(header, {
    width: 192,
    height: 258,
    colorType: 6
  });
});
