import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const copyWww = read('scripts/copy-www.js');

test('mobile Capacitor asset copy includes app shell dependencies', () => {
  assert.match(copyWww, /const manifestTargets = runtimeAssets/);
  assert.match(copyWww, /\.\.\.manifestTargets/);
  assert.match(copyWww, /'assets'/);
  assert.doesNotMatch(copyWww, /'expert-mode\.css', 'test-mode-v2\.css'/);
});
