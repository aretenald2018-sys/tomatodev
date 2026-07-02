import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const exercisesJs = readFileSync('workout/exercises.js', 'utf8');
const swJs = readFileSync('sw.js', 'utf8');

function sliceByFirstBrace(source, startToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} should exist`);
  const open = source.indexOf('{', start);
  assert.notEqual(open, -1, `${startToken} should have a body`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${startToken} body should close`);
}

test('track graph delta is displayed as percentage-point movement', () => {
  const fn = sliceByFirstBrace(exercisesJs, 'function _formatTrackGraphDelta');
  assert.match(fn, /const recent = points\.slice\(-6\)/);
  assert.match(fn, /const peak = Math\.max/);
  assert.match(fn, /lastPoint - prevPoint/);
  assert.match(fn, /return '0pp'/);
  assert.match(fn, /`\$\{pp > 0 \? '\+' : ''\}\$\{pp\}pp`/);
  assert.doesNotMatch(fn, /\(\(last - prev\) \/ prev\) \* 100/);
  assert.doesNotMatch(fn, /return `\$\{pct > 0 \? '\+' : ''\}\$\{pct\}%`/);
});

test('track graph delta class remains sign-based for pp labels', () => {
  const fn = sliceByFirstBrace(exercisesJs, 'function _trackGraphDeltaClass');
  assert.match(fn, /delta\.startsWith\('\+'\)/);
  assert.match(fn, /delta\.startsWith\('-'\)/);
});

test('wendler graph uses a separate W history instead of volume or intensity rows', () => {
  assert.match(exercisesJs, /getWendlerMetricHistory/);
  assert.match(exercisesJs, /isWendlerWorkoutEntry/);
  const fn = sliceByFirstBrace(exercisesJs, 'function _buildMaxTrackSparkline');
  assert.match(fn, /isWendlerWorkoutEntry\(entry\)/);
  assert.match(fn, /getWendlerMetricHistory/);
  assert.match(fn, /_buildTrackGraphRow\('W',\s*history\.W,\s*true\)/);
  assert.match(fn, /title="웬들러 기록은 볼륨\/강도와 분리/);
});

test('service worker cache version was bumped for track pp delta assets', () => {
  assert.match(swJs, /tomatofarm-v20260702z8-workout-sheet-check-toggle/);
});
