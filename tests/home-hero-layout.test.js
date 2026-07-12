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

test('home tomato hero is integrated into the life-zone trapezoid header without the removed name row', () => {
  const tomato = readText('home/tomato.js');
  const lifeZone = readText('home/life-zone.js');
  const css = readAppCssSync();
  const sw = readText('sw.js');

  assert.match(tomato, /renderCharacterSVG\(characterMood, \{ size: 44 \}\)/);
  assert.match(tomato, /hero:\s*\{[\s\S]*characterSvg/);
  assert.match(tomato, /homeHero\.classList\.add\('home-hero--integrated'\)/);
  assert.doesNotMatch(tomato, /class="tf-hero-sub">\$\{heroSub\}/);
  assert.match(tomato, /document\.getElementById\('tomato-rule-info-card'\)\?\.addEventListener\('click', _showTomatoRuleTooltip\)/);
  assert.match(lifeZone, /class="lz-overview\$\{hero \? '' : ' lz-overview--life-only'\}"/);
  assert.match(lifeZone, /class="lz-head lz-overview-life"/);
  assert.match(lifeZone, /class="lz-overview-hero"/);
  assert.match(lifeZone, /data-hero-message-target/);
  assert.doesNotMatch(lifeZone, /class="lz-hero/);
  assert.doesNotMatch(lifeZone, /data-lz-names/);

  assert.match(css, /\.home-hero--integrated \{ display: none; \}/);
  assert.match(css, /\.lz-overview \{[\s\S]*grid-template-columns: minmax\(0, 46%\) minmax\(0, 54%\);[\s\S]*min-height: 76px;/);
  assert.match(css, /\.lz-overview-hero \{[\s\S]*background: linear-gradient[\s\S]*clip-path: polygon\(16% 0, 100% 0, 100% 100%, 0 100%\);/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.lz-overview-hero \.tf-hero-count \{[\s\S]*font-size: 25px;[\s\S]*letter-spacing: 0;/);
  assert.match(css, /\.lz-overview-hero \.tf-hero-character \{[\s\S]*width: 38px;[\s\S]*height: 38px;/);
  assert.match(css, /\.lz-overview-hero \.tf-hero-info-btn \{[\s\S]*top: 7px;[\s\S]*right: 8px;/);
  assert.doesNotMatch(css, /\.lz-hero/);
  assert.doesNotMatch(css, /\.tf-hero-sub/);
  assert.match(sw, /const CACHE_VERSION = 'tomatofarm-v\d{8}z\d+-[^']+';/);
});
