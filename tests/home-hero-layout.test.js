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

test('home tomato hero is an isometric pixel marquee over the life-zone scene', () => {
  const tomato = readText('home/tomato.js');
  const lifeZone = readText('home/life-zone.js');
  const index = readText('index.html');
  const css = readAppCssSync();
  const sw = readText('sw.js');

  assert.match(tomato, /renderCharacterSVG\(characterMood, \{ size: 44 \}\)/);
  assert.match(tomato, /hero:\s*\{[\s\S]*characterSvg/);
  assert.match(tomato, /homeHero\.classList\.add\('home-hero--integrated'\)/);
  assert.doesNotMatch(tomato, /class="tf-hero-sub">\$\{heroSub\}/);
  assert.match(tomato, /document\.getElementById\('tomato-rule-info-card'\)\?\.addEventListener\('click', _showTomatoRuleTooltip\)/);
  assert.match(lifeZone, /class="lz-iso-marquee"/);
  assert.match(lifeZone, /class="lz-iso-marquee-panel"/);
  assert.match(lifeZone, /data-hero-message-target/);
  assert.doesNotMatch(lifeZone, /class="lz-overview/);
  assert.doesNotMatch(lifeZone, /data-lz-title|data-lz-sync/);
  assert.doesNotMatch(index, /class="sync-bar"|id="sync-text"/);
  assert.doesNotMatch(lifeZone, /class="lz-hero/);
  assert.doesNotMatch(lifeZone, /data-lz-names/);

  assert.match(css, /\.home-hero--integrated \{ display: none; \}/);
  assert.match(css, /\.lz-iso-marquee \{[\s\S]*width: min\(160px, 43%\);[\s\S]*drop-shadow\(4px 5px 0/);
  assert.match(css, /\.lz-iso-marquee-panel \{[\s\S]*clip-path: polygon\(0 17%, 100% 0, 100% 83%, 0 100%\);/);
  assert.match(css, /radial-gradient\(circle, rgba\(255,111,78,\.35\) 0 1px, transparent 1\.2px\)/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-count \{[\s\S]*font-size: 17px;[\s\S]*letter-spacing: 0;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-character \{[\s\S]*width: 27px;[\s\S]*height: 27px;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-info-btn \{[\s\S]*top: 7px;[\s\S]*right: 8px;/);
  assert.doesNotMatch(css, /\.lz-hero/);
  assert.doesNotMatch(css, /\.tf-hero-sub/);
  assert.match(sw, /const CACHE_VERSION = 'tomatofarm-v\d{8}z\d+-[^']+';/);
});
