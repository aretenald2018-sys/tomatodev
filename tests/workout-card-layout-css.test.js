import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`).exec(css);
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('workout exercise card header keeps title from being squeezed by sparkline', () => {
  const header = ruleBody('#tab-workout .ex-block-header');
  const name = ruleBody('#tab-workout .ex-block-name');
  const sparkline = ruleBody('#tab-workout .ex-block-header .ex-sparkline-wrap');
  const remove = ruleBody('#tab-workout .ex-remove-btn');

  assert.match(header, /flex-wrap:\s*wrap/);
  assert.match(name, /min-width:\s*min\(11rem,\s*52vw\)/);
  assert.match(name, /word-break:\s*keep-all/);
  assert.match(sparkline, /flex:\s*1 1 100%/);
  assert.match(sparkline, /width:\s*100%/);
  assert.match(remove, /margin-left:\s*0/);
});
