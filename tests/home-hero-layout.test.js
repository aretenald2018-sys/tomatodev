import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('home tomato hero is compact and keeps the rule button outside the removed sub row', () => {
  const tomato = readText('home/tomato.js');
  const css = readText('style.css');
  const sw = readText('sw.js');

  assert.match(tomato, /renderCharacterSVG\(characterMood, \{ size: 44 \}\)/);
  assert.match(tomato, /class="tf-info-btn tf-info-btn--light tf-hero-info-btn"/);
  assert.doesNotMatch(tomato, /class="tf-hero-sub">\$\{heroSub\}/);
  assert.match(tomato, /document\.getElementById\('tomato-rule-info-card'\)\?\.addEventListener\('click', _showTomatoRuleTooltip\)/);

  assert.match(css, /\.home-hero:has\(\.tf-card\) \{ padding: 0 0 8px;/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.tf-hero-count \{[\s\S]*font-size: 28px;[\s\S]*letter-spacing: 0;/);
  assert.match(css, /\.tf-hero-character \{[\s\S]*width: 44px; height: 44px;/);
  assert.match(css, /\.tf-hero-info-btn \{[\s\S]*position: absolute;[\s\S]*top: 8px;[\s\S]*right: 10px;/);
  assert.doesNotMatch(css, /\.tf-hero-sub/);
  assert.match(sw, /tomatofarm-v20260708z1-diet-frequent-foods/);
});
