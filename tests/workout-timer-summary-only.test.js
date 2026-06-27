import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const calendarJs = readFileSync(new URL('../render-calendar.js', import.meta.url), 'utf8');
const styleCss = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const swJs = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

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

test('workout duration remains in the top-right summary card', () => {
  const summary = sliceByFirstBrace(calendarJs, 'function _renderWorkoutDetailSummaryCard');
  assert.match(summary, /label:\s*'운동시간'/);
  assert.match(summary, /wx\?\.durationSec/);
});

test('workout calendar duration can fall back to set completion timeline', () => {
  assert.match(calendarJs, /import \{ buildWorkoutSetTimeline \} from '\.\/workout\/timeline\.js'/);
  const metrics = sliceByFirstBrace(calendarJs, 'function _workoutMetrics');
  assert.match(metrics, /const workoutTimeline = buildWorkoutSetTimeline\(d\.exercises,\s*d\.workoutDuration\)/);
  assert.match(metrics, /workoutTimeline\.durationSec/);
});

test('duration-only workout no longer creates a separate timer activity card', () => {
  const cards = sliceByFirstBrace(calendarJs, 'function _renderWorkoutDetailCards');
  assert.doesNotMatch(cards, /label:\s*'운동 타이머'/);
  assert.doesNotMatch(cards, /key:\s*'timer'/);
  assert.doesNotMatch(cards, /wx\.workoutDurationSec\s*>\s*0/);
});

test('workout detail modal no longer renders timer-only body sections', () => {
  assert.doesNotMatch(calendarJs, /const timerOnlyHtml/);
  assert.doesNotMatch(calendarJs, /cal-workout-timer-line/);
  assert.doesNotMatch(calendarJs, /운동 타이머 \$\{_formatDuration/);
  assert.doesNotMatch(calendarJs, /timer:\s*'운동 타이머'/);
  assert.doesNotMatch(styleCss, /\.cal-workout-timer-line\b/);
});

test('service worker cache version was bumped for workout timer summary-only UI', () => {
  assert.match(swJs, /tomatofarm-v20260627z2-workout-sheet-header-toggle/);
});
