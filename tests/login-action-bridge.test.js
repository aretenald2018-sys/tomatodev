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
const featureLoginJs = read('feature-login.js');
const swJs = read('sw.js');

test('login screen markup uses data-login actions instead of inline handlers', () => {
  const loginMarkup = sliceBetween(indexHtml, '<!-- 로그인 화면 -->', '<!-- 상단 네비게이션 -->');

  assert.match(loginMarkup, /id="login-password"[^>]*data-login-enter-action="create-account-login"/);
  assert.match(loginMarkup, /id="login-create-btn"[^>]*data-login-action="create-account-login"/);
  assert.match(loginMarkup, /class="login-signup-link"[^>]*data-login-action="show-signup-view"/);
  assert.match(loginMarkup, /class="signup-toggle-row"[^>]*data-login-action="toggle-signup-guild"/);
  assert.match(loginMarkup, /id="signup-guild-input"[^>]*data-login-input-action="search-guilds"[^>]*data-login-focus-action="search-guilds"[^>]*data-login-enter-action="add-guild-chip"/);
  assert.match(loginMarkup, /class="signup-toggle-row"[^>]*data-login-action="toggle-signup-pw"/);
  assert.match(loginMarkup, /class="login-btn signup-submit-btn"[^>]*data-login-action="create-account-signup"/);
  assert.match(loginMarkup, /class="signup-login-link"[^>]*data-login-action="show-login-view"/);
  assert.match(loginMarkup, /id="login-pw-modal-input"[^>]*data-login-enter-action="verify-and-login"/);
  assert.match(loginMarkup, /class="login-btn login-pw-cancel[^"]*"[^>]*data-login-action="close-password-modal"/);
  assert.match(loginMarkup, /class="login-btn u-flex-2"[^>]*data-login-action="verify-and-login"/);

  assert.doesNotMatch(loginMarkup, /\sonclick="/);
  assert.doesNotMatch(loginMarkup, /\sonkeydown="/);
  assert.doesNotMatch(loginMarkup, /\soninput="/);
  assert.doesNotMatch(loginMarkup, /\sonfocus="/);
});

test('feature-login binds login actions with a scoped idempotent bridge', () => {
  assert.match(featureLoginJs, /function _bindLoginActions\(root = document\)/);
  assert.match(featureLoginJs, /doc\.documentElement\.dataset\.loginActionsBound === '1'/);
  assert.match(featureLoginJs, /return !!control\?\.closest\?\.\('#login-screen, #login-pw-modal'\)/);
  assert.match(featureLoginJs, /doc\.addEventListener\('click', \(event\) => \{[\s\S]*\[data-login-action\][\s\S]*_runLoginAction\(control\.dataset\.loginAction, control\)[\s\S]*\}, true\)/);
  assert.match(featureLoginJs, /doc\.addEventListener\('keydown', \(event\) => \{[\s\S]*\[data-login-enter-action\][\s\S]*event\.preventDefault\(\)[\s\S]*_runLoginAction\(control\.dataset\.loginEnterAction, control\)[\s\S]*\}, true\)/);
  assert.match(featureLoginJs, /doc\.addEventListener\('input', \(event\) => \{[\s\S]*\[data-login-input-action\][\s\S]*_runLoginAction\(control\.dataset\.loginInputAction, control\)[\s\S]*\}, true\)/);
  assert.match(featureLoginJs, /doc\.addEventListener\('focusin', \(event\) => \{[\s\S]*\[data-login-focus-action\][\s\S]*_runLoginAction\(control\.dataset\.loginFocusAction, control\)[\s\S]*\}, true\)/);
  assert.match(featureLoginJs, /case 'create-account-login':[\s\S]*createAccountAndLogin\(\)/);
  assert.match(featureLoginJs, /case 'create-account-signup':[\s\S]*createAccountFromSignup\(\)/);
  assert.match(featureLoginJs, /case 'verify-and-login':[\s\S]*verifyAndLogin\(\)/);
  assert.match(featureLoginJs, /case 'search-guilds':[\s\S]*searchGuildsFor\(_loginGuildPrefix\(control\)\)/);
  assert.match(featureLoginJs, /case 'add-guild-chip':[\s\S]*addGuildChipFor\(_loginGuildPrefix\(control\)\)/);
  assert.match(featureLoginJs, /document\.addEventListener\('DOMContentLoaded', \(\) => \{[\s\S]*_bindLoginActions\(\);[\s\S]*initLoginScreen\(\);[\s\S]*\}\)/);
});

test('login restore skips guild onboarding when a running draft can resume', () => {
  assert.match(featureLoginJs, /function _hasRestorableRunningDraftForUser\(user\)/);
  assert.match(featureLoginJs, /tomatofarm_running_session_draft_active/);
  assert.match(featureLoginJs, /if \(!localStorage\.getItem\(guildObKey\) && !_hasRestorableRunningDraftForUser\(saved\)\)/);
});

test('service worker cache version was bumped for login action bridge assets', () => {
  assert.match(swJs, /tomatofarm-v20260706z7-set-type-menu-clip/);
});
