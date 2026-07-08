import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function sliceBetween(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} should exist`);
  const end = source.indexOf(endToken, start);
  assert.notEqual(end, -1, `${endToken} should exist after ${startToken}`);
  return source.slice(start, end);
}

const maxJs = read('workout/expert/max.js');
const swJs = read('sw.js');

test('Max top area render requests are coalesced through a scheduler', () => {
  const scheduler = sliceBetween(maxJs, 'let _expertTopAreaRenderScheduled = false;', 'function _targetRirLabel');
  const outsideScheduler = maxJs.replace(scheduler, '');
  const scheduledCalls = maxJs.match(/_scheduleExpertTopAreaRender\(\);/g) || [];

  assert.match(scheduler, /let _expertTopAreaRenderScheduled = false/);
  assert.match(scheduler, /if \(_expertTopAreaRenderScheduled\) return/);
  assert.match(scheduler, /window\.requestAnimationFrame\(run\)/);
  assert.match(scheduler, /window\.renderExpertTopArea\(\)/);
  assert.doesNotMatch(outsideScheduler, /window\.renderExpertTopArea/);
  assert.ok(scheduledCalls.length >= 20, 'Max actions should request renders through the scheduler');
});

test('service worker cache version was bumped for Max render scheduler', () => {
  assert.match(swJs, /tomatofarm-v20260709z1-running-gps-route-resilience/);
});
