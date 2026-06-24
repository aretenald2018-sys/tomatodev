import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
const workoutExercises = await readFile(new URL('../workout/exercises.js', import.meta.url), 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`).exec(css);
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('workout exercise card header keeps title from being squeezed by sparkline', () => {
  const header = ruleBody('#tab-workout .ex-block-header');
  const name = ruleBody('#tab-workout .ex-block-name');
  const trend = ruleBody('#tab-workout .ex-block-trend .ex-sparkline-wrap');
  const remove = ruleBody('#tab-workout .ex-remove-btn');

  assert.doesNotMatch(header, /flex-wrap:\s*nowrap/);
  assert.match(name, /min-width:\s*0/);
  assert.match(name, /word-break:\s*keep-all/);
  assert.match(trend, /width:\s*100%/);
  assert.doesNotMatch(css, /#tab-workout\s+\.ex-block-header\s+\.ex-sparkline-wrap/);
  assert.match(remove, /margin-left:\s*0/);
});

test('workout exercise card DOM renders sparkline outside title header', () => {
  const headerMatch = /<div class="ex-block-header">([\s\S]*?)<\/div>\s*\$\{sparkline \? `<div class="ex-block-trend">/.exec(workoutExercises);
  assert.ok(headerMatch, 'normal exercise card should render sparkline in ex-block-trend after header');
  assert.doesNotMatch(headerMatch[1], /\$\{sparkline\}/);
});
