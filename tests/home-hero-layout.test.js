import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('home tomato hero is integrated into the life-zone card without the removed name row', () => {
  const tomato = readText('home/tomato.js');
  const lifeZone = readText('home/life-zone.js');
  const css = readText('style.css');
  const sw = readText('sw.js');

  assert.match(tomato, /renderCharacterSVG\(characterMood, \{ size: 44 \}\)/);
  assert.match(tomato, /hero:\s*\{[\s\S]*characterSvg/);
  assert.match(tomato, /homeHero\.classList\.add\('home-hero--integrated'\)/);
  assert.doesNotMatch(tomato, /class="tf-hero-sub">\$\{heroSub\}/);
  assert.match(tomato, /document\.getElementById\('tomato-rule-info-card'\)\?\.addEventListener\('click', _showTomatoRuleTooltip\)/);
  assert.match(lifeZone, /class="lz-hero tf-hero tf-hero--gradient"/);
  assert.match(lifeZone, /data-hero-message-target/);
  assert.doesNotMatch(lifeZone, /data-lz-names/);

  assert.match(css, /\.home-hero--integrated \{ display: none; \}/);
  assert.match(css, /\.lz-hero \{[\s\S]*min-height: 74px;/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.tf-hero-count \{[\s\S]*font-size: 28px;[\s\S]*letter-spacing: 0;/);
  assert.match(css, /\.tf-hero-character \{[\s\S]*width: 44px; height: 44px;/);
  assert.match(css, /\.tf-hero-info-btn \{[\s\S]*position: absolute;[\s\S]*top: 8px;[\s\S]*right: 10px;/);
  assert.doesNotMatch(css, /\.tf-hero-sub/);
  assert.match(sw, /tomatofarm-v20260711z10-diet-search-live-food-db/);
});
