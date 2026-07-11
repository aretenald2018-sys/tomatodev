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

const indexHtml = read('index.html');
const appJs = read('app.js');
const navigationJs = read('navigation.js');
const swJs = read('sw.js');

test('app shell markup uses data-app actions instead of inline handlers', () => {
  const shellMarkup = sliceBetween(indexHtml, '<!-- 알림센터 패널 -->', '<!-- ═══ 홈 탭 ═══ -->');
  const actions = [
    'install-pwa',
    'install-apk',
    'open-letter-modal',
    'toggle-notif-center',
    'refresh-app-update',
    'logout-account',
    'mark-all-notifs-read',
    'close-notif-center',
    'switch-tab',
    'toggle-more-menu',
    'switch-tab-close-more',
    'open-tab-settings-close-more',
    'close-tab-settings',
    'save-tab-settings'
  ];

  for (const action of actions) {
    assert.match(shellMarkup, new RegExp(`data-app-action="${action}"`));
  }

  assert.doesNotMatch(shellMarkup, /\sonclick="/);
  assert.doesNotMatch(shellMarkup, /class="[^"]*\btop-nav\b/);
  assert.match(shellMarkup, /data-app-action="install-apk"[\s\S]*APK 설치하기/);
  assert.match(shellMarkup, /more-menu-section--app-actions[\s\S]*id="letter-btn"[\s\S]*개발자에게 편지/);
  assert.match(shellMarkup, /more-menu-section--app-actions[\s\S]*id="notif-bell"[\s\S]*알림/);
  assert.match(shellMarkup, /more-menu-section--app-actions[\s\S]*id="app-refresh-btn"[\s\S]*앱 새로고침/);
  assert.match(shellMarkup, /more-menu-section--app-actions[\s\S]*data-app-action="logout-account"[\s\S]*계정 전환/);
});

test('app module binds app shell actions with one idempotent bridge', () => {
  assert.match(appJs, /const APP_SHELL_ACTION_SCOPE = /);
  assert.doesNotMatch(appJs, /APP_SHELL_ACTION_SCOPE = '[^']*\.top-nav/);
  assert.match(appJs, /function _bindAppShellActions\(root = document\)/);
  assert.match(appJs, /appShellActionsBound/);
  assert.match(appJs, /target\?\.closest\?\.\('\[data-app-action\]'\)/);
  assert.match(appJs, /control\.id === 'tab-settings-modal' && event\.target !== control/);
  assert.match(appJs, /_bindAppShellActions\(\);\s*\ninit\(\);/);

  for (const action of [
    'install-pwa',
    'install-apk',
    'open-letter-modal',
    'toggle-notif-center',
    'refresh-app-update',
    'logout-account',
    'mark-all-notifs-read',
    'close-notif-center',
    'switch-tab',
    'toggle-more-menu',
    'switch-tab-close-more',
    'open-tab-settings-close-more',
    'close-tab-settings',
    'save-tab-settings'
  ]) {
    assert.match(appJs, new RegExp(`case '${action}':`));
  }

  assert.match(appJs, /moreBtn\.dataset\.appAction = adminOnlyMode \? 'switch-tab' : 'toggle-more-menu'/);
  assert.match(appJs, /moreBtn\.dataset\.tab = adminOnlyMode \? 'admin' : 'more'/);
  assert.match(appJs, /moreBtn\.onclick = null/);
  assert.match(appJs, /window\.__requestTomatoAppRefresh\(\{ control, source: 'more-menu' \}\)/);
});

test('dynamic more menu items inherit the app shell action contract', () => {
  assert.match(navigationJs, /item\.type = 'button'/);
  assert.match(navigationJs, /item\.dataset\.appAction = 'switch-tab-close-more'/);
  assert.doesNotMatch(navigationJs, /item\.onclick = \(\) => \{ window\.switchTab/);
});

test('service worker cache version was bumped for app shell action bridge assets', () => {
  assert.match(swJs, /tomatofarm-v20260711z11-headerless-lifezone-trapezoid/);
});
