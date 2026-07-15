import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('home chat stays below the life-zone and the summary is mounted after chat', () => {
  const html = read('index.html');
  const tomato = read('home/tomato.js');
  const heroAt = html.indexOf('id="home-hero"');
  const chatAt = html.indexOf('id="card-chat"');
  const leaderboardAt = html.indexOf('id="card-leaderboard"');

  assert.ok(heroAt >= 0);
  assert.ok(chatAt > heroAt);
  assert.ok(leaderboardAt > chatAt);
  assert.match(tomato, /renderLifeZoneSummary/);
  assert.match(tomato, /chatCard\.after\(summaryCard\)/);
});

test('chat history persists in Firestore and supports owner-checked deletion', () => {
  const dataSource = read('data/data-social-interact.js');
  const chatBlock = dataSource.slice(
    dataSource.indexOf('// ── 홈 실시간 채팅'),
    dataSource.indexOf('// ── Cheers 설정'),
  );

  assert.match(chatBlock, /setDoc\(doc\(db, '_chat_messages', id\), entry\)/);
  assert.match(chatBlock, /onSnapshot\(chatQuery/);
  assert.match(chatBlock, /orderBy\('createdAt', 'asc'\)/);
  assert.match(chatBlock, /export async function deleteChatMessage/);
  assert.match(chatBlock, /myIds\.has\(ownerId\)/);
  assert.match(chatBlock, /deleteDoc\(messageRef\)/);
  assert.doesNotMatch(chatBlock, /localStorage|sessionStorage|expiresAt/);
});

test('MMORPG chat rows, notices, safe text and own-message delete controls are wired', () => {
  const html = read('index.html');
  const dataSource = read('data/data-social-interact.js');
  const homeSource = read('home/chat.js');
  const css = read('styles/features/home-foundations.css');

  assert.match(html, /class="tds-sr-only" for="home-chat-input"/);
  assert.match(dataSource, /CHAT_NOTICE_PREFIX = '<공지>'/);
  assert.match(homeSource, /bubble\.textContent =/);
  assert.match(homeSource, /channel\.textContent = message\.isNotice \? '\[공지\]' : '\[전체\]'/);
  assert.match(homeSource, /message\.userId === currentUserId/);
  assert.match(homeSource, /_deleteOwnMessage\(message\.id, deleteButton\)/);
  assert.match(css, /\.home-chat-message\.is-notice \.home-chat-bubble/);
  assert.match(css, /grid-template-columns: auto minmax\(34px, auto\) minmax\(0, 1fr\) auto/);
  assert.match(css, /align-content: end/);
});
