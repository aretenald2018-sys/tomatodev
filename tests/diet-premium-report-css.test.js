import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readAppCssSync } from './helpers/css-source.js';

const reportSource = readFileSync('feature-diet-premium-report.js', 'utf8');
const appCss = readAppCssSync();
const runtimeAssets = readFileSync('runtime-assets.js', 'utf8');

test('premium diet report presentation is owned by static feature CSS', () => {
  assert.doesNotMatch(reportSource, /document\.createElement\(['"]style['"]\)/);
  assert.doesNotMatch(reportSource, /_ensureStyles/);
  assert.match(appCss, /\.dpr-overlay\s*\{/);
  assert.match(appCss, /@media print[\s\S]*\.dpr-overlay/);
  assert.match(runtimeAssets, /\.\/styles\/features\/diet-premium-report\.css/);
});
