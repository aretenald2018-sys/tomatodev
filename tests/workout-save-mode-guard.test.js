import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function findSaveDayCalls(source) {
  const calls = [];
  let idx = 0;
  while ((idx = source.indexOf('saveDay(', idx)) >= 0) {
    const before = source.slice(Math.max(0, idx - 40), idx);
    if (/function\s+$/.test(before) || /export\s+async\s+function\s+$/.test(before)) {
      idx += 'saveDay('.length;
      continue;
    }

    let depth = 0;
    let end = idx;
    for (; end < source.length; end++) {
      const ch = source[end];
      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }
    calls.push(source.slice(idx, end));
    idx = end;
  }
  return calls;
}

test('saveDay defaults to merge and blocks replace without an explicit opt-in', () => {
  const src = read('data/data-save.js');
  assert.match(src, /mode = 'merge'/);
  assert.match(src, /allowReplace = false/);
  assert.match(src, /saveDay replace requires allowReplace:true/);
  assert.match(src, /if \(!allowReplace\)/);
});

test('runtime saveDay calls use merge mode explicitly', () => {
  const files = [
    'sheet.js',
    'render-cooking.js',
    'render-calendar.js',
    'workout/save.js',
    'workout/expert/max.js',
  ];

  for (const file of files) {
    const src = read(file);
    for (const call of findSaveDayCalls(src)) {
      assert.match(call, /mode:\s*['"]merge['"]/, `${file} has unsafe saveDay call: ${call}`);
      assert.doesNotMatch(call, /updatedDay/, `${file} should not merge a whole cached day object`);
    }
  }
});

test('service worker cache version was bumped for save guard assets', () => {
  const sw = read('sw.js');
  assert.match(sw, /tomatofarm-v20260627z8-home-life-zone-motion/);
});
