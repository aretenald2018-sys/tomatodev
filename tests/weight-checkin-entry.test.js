import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('life-zone weight summary opens the check-in modal through an imported function', () => {
  const tomatoJs = read('home/tomato.js');

  assert.match(
    tomatoJs,
    /import \{ openCheckinModal \} from '\.\.\/feature-checkin\.js';/,
  );
  assert.match(tomatoJs, /onWeightClick:\s*\(\) => openCheckinModal\(\)/);
  assert.doesNotMatch(tomatoJs, /window\.openCheckinModal/);
});

test('weight check-in entry asset is cached under a versioned service worker', () => {
  const runtimeAssetsJs = read('runtime-assets.js');
  const swJs = read('sw.js');

  assert.match(runtimeAssetsJs, /'\.\/home\/tomato\.js'/);
  assert.match(swJs, /const CACHE_VERSION = 'tomatodev-v\d{8}z\d+-[^']+';/);
});
