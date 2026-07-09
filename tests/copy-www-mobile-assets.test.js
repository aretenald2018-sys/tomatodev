import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const copyWww = read('scripts/copy-www.js');

test('mobile Capacitor asset copy includes app shell dependencies', () => {
  assert.match(copyWww, /'expert-mode\.css'/);
  assert.match(copyWww, /'test-mode-v2\.css'/);
  assert.match(copyWww, /'calc'/);
});
