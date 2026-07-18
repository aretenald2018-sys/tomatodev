import { readAppCssSync } from './helpers/css-source.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readPngMeta(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25)
  };
}

test('home tomato hero and marquee share the fixed 1672 life-zone world', () => {
  const tomato = readText('home/tomato.js');
  const lifeZone = readText('home/life-zone.js');
  const index = readText('index.html');
  const css = readAppCssSync();
  const sw = readText('sw.js');
  const runtimeAssets = readText('runtime-assets.js');

  assert.match(tomato, /renderCharacterSVG\(characterMood, \{ size: 44 \}\)/);
  assert.match(tomato, /hero:\s*\{[\s\S]*characterSvg/);
  assert.match(tomato, /homeHero\.classList\.add\('home-hero--integrated'\)/);
  assert.doesNotMatch(tomato, /class="tf-hero-sub">\$\{heroSub\}/);
  assert.match(tomato, /document\.getElementById\('tomato-rule-info-card'\)\?\.addEventListener\('click', _showTomatoRuleTooltip\)/);
  assert.match(lifeZone, /const LIFE_ZONE_WORLD_SIZE = 1672/);
  assert.match(lifeZone, /const LIFE_ZONE_MARQUEE_FRAME_SRC = `\$\{LIFE_ZONE_UI_ROOT\}\/streak-marquee-frame-v3\.png`/);
  assert.match(lifeZone, /class="lz-marquee-canvas"/);
  assert.match(lifeZone, /data-lz-marquee-canvas/);
  assert.match(lifeZone, /class="lz-marquee-hotspot"[\s\S]*id="tomato-rule-info-card"/);
  assert.match(lifeZone, /canvas\.width = LIFE_ZONE_WORLD_SIZE/);
  assert.match(lifeZone, /context\.imageSmoothingEnabled = false/);
  assert.match(lifeZone, /const MARQUEE_LED_PANEL = Object\.freeze/);
  assert.match(lifeZone, /context\.lineTo\(panel\.x \+ panel\.width, panel\.y \+ panel\.rise\)/);
  assert.match(lifeZone, /context\.clip\(\)/);
  assert.match(lifeZone, /context\.transform\(1, panel\.rise \/ panel\.width, 0, 1, panel\.x, panel\.y\)/);
  assert.match(lifeZone, /String\(Math\.min\(999, streak\)\)\.padStart\(3, '0'\)/);
  assert.match(lifeZone, /canvas\.dataset\.lzMarqueeReady = 'true'/);
  assert.doesNotMatch(lifeZone, /context\.rotate\(-Math\.atan\(0\.5\)\)/);
  assert.doesNotMatch(lifeZone, /lz-iso-marquee|lz-marquee-composite|streak-marquee-facade-v2/);
  assert.doesNotMatch(lifeZone, /class="lz-overview/);
  assert.doesNotMatch(lifeZone, /data-lz-title|data-lz-sync/);
  assert.doesNotMatch(index, /class="sync-bar"|id="sync-text"/);
  assert.doesNotMatch(lifeZone, /class="lz-hero/);
  assert.doesNotMatch(lifeZone, /data-lz-names/);

  assert.match(css, /\.home-hero--integrated \{ display: none; \}/);
  assert.match(css, /\.lz-marquee-canvas \{[\s\S]*inset: 0;[\s\S]*width: 100%;[\s\S]*height: 100%;[\s\S]*image-rendering: pixelated;[\s\S]*pointer-events: none;/);
  assert.match(css, /\.lz-marquee-hotspot \{[\s\S]*left: calc\(18 \/ 1672 \* 100%\);[\s\S]*width: calc\(820 \/ 1672 \* 100%\);[\s\S]*height: calc\(430 \/ 1672 \* 100%\);/);
  assert.doesNotMatch(css, /\.lz-marquee-composite|\.lz-iso-marquee|\.lz-marquee-underlay|scaleY\(var\(--lz-marquee/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.lz-scene \{[\s\S]*container-type: inline-size;/);
  assert.match(css, /\.lz-scene \{[\s\S]*background: #050505;/);
  assert.match(css, /\.lz-base \{[\s\S]*z-index: 1;[\s\S]*pointer-events: none;/);
  assert.match(runtimeAssets, /\.\/assets\/home\/life-zone\/ui\/streak-marquee-frame-v3\.png/);
  assert.deepEqual(readPngMeta('assets/home/life-zone/ui/streak-marquee-frame-v3.png'), {
    width: 1536,
    height: 1024,
    colorType: 6
  });
  assert.doesNotMatch(css, /\.lz-hero/);
  assert.doesNotMatch(css, /\.tf-hero-sub/);
  assert.match(sw, /const CACHE_VERSION = 'tomatodev-v\d{8}z\d+-[^']+';/);
});
