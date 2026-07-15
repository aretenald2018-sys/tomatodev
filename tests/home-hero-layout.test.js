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

test('home tomato hero mounts the imagegen marquee into the upper-left dark frame', () => {
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
  assert.match(lifeZone, /class="lz-iso-marquee"/);
  assert.match(lifeZone, /class="lz-iso-marquee-art"/);
  assert.match(lifeZone, /class="lz-iso-marquee-panel"/);
  assert.match(lifeZone, /streak-marquee-iso-card-v1\.png/);
  assert.match(lifeZone, /data-hero-message-target/);
  assert.doesNotMatch(lifeZone, /class="lz-overview/);
  assert.doesNotMatch(lifeZone, /data-lz-title|data-lz-sync/);
  assert.doesNotMatch(index, /class="sync-bar"|id="sync-text"/);
  assert.doesNotMatch(lifeZone, /class="lz-hero/);
  assert.doesNotMatch(lifeZone, /data-lz-names/);

  assert.match(css, /\.home-hero--integrated \{ display: none; \}/);
  assert.match(css, /\.lz-iso-marquee \{[\s\S]*top: calc\(-1 \* min\(20vw, 143px\)\);[\s\S]*left: calc\(-1 \* min\(3\.6vw, 26px\)\);[\s\S]*z-index: 0;[\s\S]*width: min\(76%, 540px\);[\s\S]*background: transparent;[\s\S]*drop-shadow\(2px 4px 0/);
  assert.match(css, /\.lz-iso-marquee-art \{[\s\S]*object-fit: contain;/);
  assert.match(css, /\.lz-iso-marquee-panel \{[\s\S]*left: 14%;[\s\S]*top: 35%;[\s\S]*width: 80%;[\s\S]*transform: skewY\(-14\.5deg\);/);
  assert.match(css, /\.lz-iso-marquee-panel \{[\s\S]*background: rgba\(20,0,0,\.42\);/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-count \{[\s\S]*font-size: 26px;[\s\S]*-webkit-text-stroke: \.7px #71180e;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-character \{[\s\S]*width: 31px;[\s\S]*height: 31px;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-info-btn \{[\s\S]*top: 3px;[\s\S]*right: 3px;/);
  assert.match(css, /\.lz-world \{[\s\S]*z-index: 1;[\s\S]*pointer-events: none;/);
  assert.match(css, /\.lz-world \[data-lz-action\] \{[\s\S]*pointer-events: auto;/);
  assert.match(runtimeAssets, /\.\/assets\/home\/life-zone\/ui\/streak-marquee-iso-card-v1\.png/);
  assert.deepEqual(readPngMeta('assets/home/life-zone/ui/streak-marquee-iso-card-v1.png'), {
    width: 1034,
    height: 891,
    colorType: 6
  });
  assert.doesNotMatch(css, /\.lz-hero/);
  assert.doesNotMatch(css, /\.tf-hero-sub/);
  assert.match(sw, /const CACHE_VERSION = 'tomatofarm-v\d{8}z\d+-[^']+';/);
});
