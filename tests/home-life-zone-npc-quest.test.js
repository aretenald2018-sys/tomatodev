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
  assert.match(source, /const LIFE_ZONE_MIRANDA_NAME = '미란다'/);
  assert.match(source, /LIFE_ZONE_UI_ROOT/);
  assert.match(source, /npc-quest-bubble\.png/);
  assert.match(source, /miranda-npc-home\.png/);
  assert.match(source, /class="lz-world"/);
  assert.match(source, /data-lz-action="npc-quest"/);
  assert.match(source, /data-lz-action="miranda-quest"/);
  assert.match(source, /class="lz-npc-bulb"/);
  assert.match(source, /class="lz-npc-bulb lz-npc-bulb--miranda"/);
  assert.match(source, /class="lz-nameplate lz-nameplate--npc"/);
  assert.match(source, /aria-label="트레이너 퀘스트 보기"/);
  assert.match(source, /aria-label="미란다 대화 보기"/);
  assert.match(source, /title="트레이너 퀘스트"/);
  assert.match(source, /title="미란다"/);
  assert.match(source, /addEventListener\('click'/);
  assert.match(source, /life-zone:npc-quest/);
  assert.match(source, /detail: \{ npc: 'trainer' \}/);
  assert.match(source, /detail: \{ npc: 'miranda' \}/);
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

  assert.match(css, /\.lz-scene \{[\s\S]*aspect-ratio: 1672 \/ 1672;/);
  assert.match(css, /\.lz-world \{[\s\S]*aspect-ratio: 1672 \/ 1672;[\s\S]*overflow: visible;/);
  assert.match(css, /\.lz-npc-quest \{/);
  assert.match(css, /left: calc\(1118 \/ 1672 \* 100%\)/);
  assert.match(css, /top: calc\(716 \/ 1672 \* 100%\)/);
  assert.match(css, /width: clamp\(52px, calc\(168 \/ 1672 \* 100%\), 76px\)/);
  assert.match(css, /display: flex/);
  assert.match(css, /min-height: 0/);
  assert.match(css, /transform: translate\(-50%, 0\)/);
  assert.match(css, /pointer-events: auto/);
  assert.match(css, /touch-action: manipulation/);
  assert.match(css, /\.lz-npc-quest:focus-visible/);
  assert.match(css, /\.lz-npc-bulb \{[\s\S]*width: 50%;[\s\S]*aspect-ratio: 192 \/ 150;[\s\S]*overflow: hidden;/);
  assert.match(css, /\.lz-npc-bulb \{[\s\S]*animation: lz-npc-bulb-blink 2\.4s ease-in-out infinite;/);
  assert.match(css, /@keyframes lz-npc-bulb-blink/);
  assert.match(css, /drop-shadow\(0 0 8px rgba\(255, 226, 88, 0\.92\)\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.lz-npc-bulb,[\s\S]*animation: none;/);
  assert.match(css, /\.lz-npc-bulb img \{/);
  assert.match(css, /\.lz-npc-quest \.lz-nameplate/);
  assert.match(css, /position: static/);
  assert.match(css, /overflow: visible/);
  assert.match(css, /\.lz-miranda-npc \{/);
  assert.match(css, /left: calc\(292 \/ 1672 \* 100%\)/);
  assert.match(css, /top: calc\(1238 \/ 1672 \* 100%\)/);
  assert.match(css, /width: clamp\(26px, calc\(78 \/ 1672 \* 100%\), 36px\)/);
  assert.match(css, /\.lz-miranda-npc-img \{/);
  assert.match(css, /transform: scaleX\(-1\)/);
  assert.match(css, /\.lz-miranda-npc \.lz-npc-bulb \{/);
  assert.match(css, /\.lz-miranda-npc \.lz-nameplate \{/);
  assert.match(css, /\.lz-miranda-npc:focus-visible/);
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

test('life zone running actors render track sprites and a map capture bubble on home', () => {
  const source = readText('home/life-zone.js');
  const css = readText('style.css');
  const sw = readText('sw.js');
  const plan = readText('docs/ai/features/2026-06-29-running-track-live-art.md');
  const sprites = [
    'jups-running-track.png',
    'moonjung-tomato-running-track.png',
    'lee-jaeheon-running-track.png'
  ];

  assert.match(source, /window\.__tomatoRunningLive/);
  assert.match(source, /lifeZoneRunningLive/);
  assert.match(source, /readRunningMapConfig/);
  assert.match(source, /resolveRunningMapConfig/);
  assert.match(source, /CONFIG\.MAPS\?\.VWORLD_API_KEY/);
  assert.match(source, /buildVworldTileUrl/);
  assert.match(source, /normalizeRunningMapPoints/);
  assert.match(source, /function _buildRunningMapBubbleData/);
  assert.match(source, /function _renderRunningMapBubble/);
  assert.match(source, /bubble\.dataset\.lzRunningMapBubble = '1'/);
  assert.match(source, /bubble\.dataset\.lzRunningMapState = map\.state/);
  assert.match(source, /lz-running-map-tile/);
  assert.match(source, /lz-running-map-path/);
  assert.match(source, /lz-running-map-place/);
  assert.match(source, /const place = String\(actor\.runningMap\?\.placeLabel \|\| ''\)\.trim\(\)/);
  assert.doesNotMatch(source, /map\.state === 'ready' \? '위치 확인 중'/);
  assert.match(source, /lifeZoneRunningRoute/);
  assert.match(source, /actor\.state === 'running'/);
  assert.match(source, /selfRunning \? actor\.source === 'self' : !runningBubbleRendered/);
  assert.equal(fs.existsSync(path.join(root, 'scripts/make-life-zone-running-sprites.py')), false);
  assert.equal(fs.existsSync(path.join(root, 'scripts/process-life-zone-running-sprites.py')), true);
  assert.match(plan, /imagegen/);
  assert.match(plan, /jups-running-track\.png/);
  assert.match(plan, /moonjung-tomato-running-track\.png/);
  assert.match(plan, /lee-jaeheon-running-track\.png/);

  assert.match(css, /\.lz-actor--pose-running-track \{/);
  assert.match(css, /\.lz-actor--pose-running-track::before \{/);
  assert.match(css, /--lz-run-scale:\s*\.9/);
  assert.match(css, /aspect-ratio: 128 \/ 192/);
  assert.match(css, /background-size: 200% 100%/);
  assert.match(css, /animation: lz-running-track-steps 0\.54s step-end infinite/);
  assert.match(css, /animation: lz-running-track-in-place var\(--lz-run-duration, 0\.58s\) ease-in-out infinite/);
  assert.match(css, /@keyframes lz-running-track-in-place/);
  assert.match(css, /@keyframes lz-running-track-steps/);
  assert.match(css, /49\.999% \{[\s\S]*background-position: 0 0;/);
  assert.match(css, /50%[\s\S]*background-position: 100% 0;/);
  assert.doesNotMatch(css, /steps\(2, end\)/);
  assert.doesNotMatch(css, /background-position: 50%/);
  assert.doesNotMatch(css, /@keyframes lz-running-track-lap/);
  assert.doesNotMatch(css, /--lz-run-x0|--lz-run-x1/);
  assert.doesNotMatch(css, /translate3d\(var\(--lz-run-x0/);
  assert.doesNotMatch(css.match(/@keyframes lz-running-track-in-place \{[\s\S]*?\n\}/)?.[0] || '', /rotate|translateX|--lz-run-x/);
  assert.match(css, /\.lz-running-map-bubble \{/);
  assert.match(css, /width: clamp\(52px, calc\(172 \/ 1672 \* 100%\), 76px\)/);
  assert.match(css, /\.lz-running-map-tile \{/);
  assert.match(css, /\.lz-running-map-path \{/);
  assert.match(css, /\.lz-running-map-current \{/);
  assert.match(css, /\.lz-running-map-place \{/);
  assert.doesNotMatch(css, /\.lz-running-map-road/);
  assert.doesNotMatch(css, /\.lz-running-map-route/);
  assert.doesNotMatch(css, /\.lz-running-map-pin/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.lz-actor--pose-running-track,[\s\S]*\.lz-actor--pose-running-track::before[\s\S]*animation: none;/);

  for (const sprite of sprites) {
    assert.match(sw, new RegExp(`\\.\\/assets\\/home\\/life-zone\\/sprites\\/${sprite.replace('.', '\\.')}`));
    assert.deepEqual(readPngHeader(`assets/home/life-zone/sprites/${sprite}`), {
      width: 256,
      height: 192,
      colorType: 6
    });
  }
});

test('life zone NPC bulb source is a tracked transparent PNG runtime asset', () => {
  const sw = readText('sw.js');
  const header = readPngHeader('assets/home/life-zone/ui/npc-quest-bubble.png');

  assert.match(sw, /tomatofarm-v20260629z12-home-map-label-miranda/);
  assert.match(sw, /\.\/assets\/home\/life-zone\/ui\/npc-quest-bubble\.png/);
  assert.deepEqual(header, {
    width: 192,
    height: 258,
    colorType: 6
  });
});

test('life zone Miranda home NPC is a separate transparent generated runtime asset', () => {
  const sw = readText('sw.js');
  const header = readPngHeader('assets/home/life-zone/ui/miranda-npc-home.png');

  assert.match(sw, /\.\/assets\/home\/life-zone\/ui\/miranda-npc-home\.png/);
  assert.deepEqual(header, {
    width: 142,
    height: 256,
    colorType: 6
  });
});
