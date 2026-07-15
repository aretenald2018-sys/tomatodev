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
  assert.match(lifeZone, /class="lz-iso-marquee"/);
  assert.match(lifeZone, /class="lz-marquee-underlay"/);
  assert.match(lifeZone, /class="lz-iso-marquee-panel"/);
  assert.match(lifeZone, /streak-marquee-facade-v2\.png/);
  assert.match(lifeZone, /<div class="lz-world">\s*<img[\s\S]*class="lz-marquee-underlay"[\s\S]*\$\{heroHtml\}\s*<img\s*class="lz-base"/);
  assert.match(lifeZone, /data-hero-message-target/);
  assert.doesNotMatch(lifeZone, /class="lz-overview/);
  assert.doesNotMatch(lifeZone, /data-lz-title|data-lz-sync/);
  assert.doesNotMatch(index, /class="sync-bar"|id="sync-text"/);
  assert.doesNotMatch(lifeZone, /class="lz-hero/);
  assert.doesNotMatch(lifeZone, /data-lz-names/);

  assert.match(css, /\.home-hero--integrated \{ display: none; \}/);
  assert.match(css, /\.lz-iso-marquee \{[\s\S]*top: calc\(205 \/ 1672 \* 100%\);[\s\S]*left: calc\(105 \/ 1672 \* 100%\);[\s\S]*z-index: 2;[\s\S]*width: calc\(560 \/ 1672 \* 100%\);[\s\S]*height: calc\(120 \/ 1672 \* 100%\);/);
  assert.match(css, /\.lz-marquee-underlay \{[\s\S]*top: calc\(-20 \/ 1672 \* 100%\);[\s\S]*left: calc\(-17 \/ 1672 \* 100%\);[\s\S]*width: calc\(920 \/ 1672 \* 100%\);[\s\S]*transform: scaleY\(1\.55\);[\s\S]*transform-origin: 0 81%;/);
  assert.match(css, /\.lz-iso-marquee-panel \{[\s\S]*inset: 0;[\s\S]*width: 100%;[\s\S]*transform: skewY\(-24deg\);/);
  assert.match(css, /\.lz-iso-marquee-panel \{[\s\S]*overflow: visible;[\s\S]*border: 0;[\s\S]*background: transparent;/);
  assert.match(css, /\.lz-iso-marquee-panel \{[\s\S]*grid-template-columns: minmax\(0, max-content\) max\(22px, 4cqw\);[\s\S]*justify-content: center;[\s\S]*gap: max\(4px, 1cqw\);/);
  assert.doesNotMatch(css, /\.lz-iso-marquee \.tf-hero-left \{[^}]*translateY/);
  assert.match(css, /\.tf-hero \{[\s\S]*min-height: 58px;[\s\S]*padding: 8px 38px 8px 14px;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-count \{[\s\S]*font-size: max\(21px, 4\.4cqw\);[\s\S]*-webkit-text-stroke: \.7px #71180e;/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-character \{[\s\S]*width: max\(22px, 4cqw\);[\s\S]*height: max\(22px, 4cqw\);/);
  assert.match(css, /\.lz-iso-marquee \.tf-hero-info-btn \{[\s\S]*top: 3px;[\s\S]*right: 3px;/);
  assert.match(css, /\.lz-scene \{[\s\S]*container-type: inline-size;/);
  assert.match(css, /\.lz-scene \{[\s\S]*background: #050505;/);
  assert.doesNotMatch(css, /@container \(min-width: 900px\)[^{]*\{[^}]*\.lz-marquee-underlay/);
  assert.match(css, /\.lz-base \{[\s\S]*z-index: 1;[\s\S]*pointer-events: none;/);
  assert.match(runtimeAssets, /\.\/assets\/home\/life-zone\/ui\/streak-marquee-facade-v2\.png/);
  assert.deepEqual(readPngMeta('assets/home/life-zone/ui/streak-marquee-facade-v2.png'), {
    width: 1774,
    height: 887,
    colorType: 6
  });
  assert.doesNotMatch(css, /\.lz-hero/);
  assert.doesNotMatch(css, /\.tf-hero-sub/);
  assert.match(sw, /const CACHE_VERSION = 'tomatofarm-v\d{8}z\d+-[^']+';/);
});
