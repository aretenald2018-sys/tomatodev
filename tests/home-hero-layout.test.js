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

test('home tomato hero uses an imagegen isometric marquee inside the left half card', () => {
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
  assert.match(css, /\.lz-iso-marquee \{[\s\S]*width: min\(50%, 220px\);[\s\S]*aspect-ratio: 1\.55;[\s\S]*border-radius: 18px;/);
  assert.match(css, /\.lz-iso-marquee-art \{[\s\S]*object-fit: cover;[\s\S]*object-position: center top;/);
  assert.match(css, /\.lz-iso-marquee-panel \{[\s\S]*left: 14%;[\s\S]*top: 46%;[\s\S]*width: 80%;[\s\S]*transform: skewY\(-14\.5deg\);/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-count \{[\s\S]*font-size: 15px;[\s\S]*letter-spacing: 0;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-character \{[\s\S]*width: 24px;[\s\S]*height: 24px;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-info-btn \{[\s\S]*top: 2px;[\s\S]*right: 2px;/);
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
