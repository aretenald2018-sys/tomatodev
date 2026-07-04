import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pwaRegisterJs = readFileSync(new URL('../pwa-register.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const swJs = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('production app service worker updates auto apply when no workout draft is active', () => {
  assert.match(pwaRegisterJs, /APP_SW_AUTO_RELOAD_TIMEOUT_MS\s*=\s*1500/);
  assert.match(pwaRegisterJs, /function _hasActiveWorkoutDraftForAppSWUpdate\(\)/);
  assert.match(pwaRegisterJs, /window\.__wtHasActiveDraft/);
  assert.match(pwaRegisterJs, /function _autoApplyAppSWUpdate\(registration,\s*worker = null\)/);
  assert.match(pwaRegisterJs, /navigator\.serviceWorker\.addEventListener\('controllerchange',\s*reloadOnce,\s*\{ once: true \}\)/);
  assert.match(pwaRegisterJs, /targetWorker\.postMessage\(\{ type: 'SKIP_WAITING' \}\)/);
  assert.match(pwaRegisterJs, /setTimeout\(reloadOnce,\s*APP_SW_AUTO_RELOAD_TIMEOUT_MS\)/);
  assert.match(pwaRegisterJs, /allowAutoReload && _autoApplyAppSWUpdate\(pending\.registration,\s*pending\.worker\)/);
  assert.match(pwaRegisterJs, /window\.__tomatoAppReady && show\(\)/);
  assert.match(pwaRegisterJs, /window\.addEventListener\('tomato-app-ready',\s*show,\s*\{ once: true \}\)/);
});

test('production app cache busts the service worker registrar script', () => {
  assert.match(indexHtml, /pwa-register\.js\?v=20260630z14-sw-auto-update/);
  assert.match(swJs, /tomatofarm-v20260704z1-workout-set-copy-expand/);
});
