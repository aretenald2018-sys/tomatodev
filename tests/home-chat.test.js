import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('home chat card stays below the hero and above the leaderboard', () => {
  const html = read('index.html');
  const heroAt = html.indexOf('id="home-hero"');
  const chatAt = html.indexOf('id="card-chat"');
  const leaderboardAt = html.indexOf('id="card-leaderboard"');

  assert.ok(heroAt >= 0);
  assert.ok(chatAt > heroAt);
  assert.ok(leaderboardAt > chatAt);
});

test('chat history uses persistent Firestore documents without session expiry or deletion', () => {
  const dataSource = read('data/data-social-interact.js');
  const chatBlock = dataSource.slice(
    dataSource.indexOf('// ── 홈 실시간 채팅'),
    dataSource.indexOf('// ── Cheers 설정'),
  );

  assert.match(chatBlock, /setDoc\(doc\(db, '_chat_messages', id\), entry\)/);
  assert.match(chatBlock, /onSnapshot\(chatQuery/);
  assert.match(chatBlock, /orderBy\('createdAt', 'asc'\)/);
  assert.doesNotMatch(chatBlock, /localStorage|sessionStorage|deleteDoc|expiresAt/);
});

test('notice messages and safe text rendering are wired into the chat card', () => {
  const dataSource = read('data/data-social-interact.js');
  const homeSource = read('home/chat.js');
  const css = read('styles/features/home-foundations.css');

  assert.match(dataSource, /CHAT_NOTICE_PREFIX = '<공지>'/);
  assert.match(homeSource, /bubble\.textContent =/);
  assert.match(css, /\.home-chat-message\.is-notice \.home-chat-bubble/);
  assert.match(css, /color: var\(--primary\); font-weight: 800/);
});
