import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('home chat is integrated into the life-zone and the summary follows the combined card', () => {
  const html = read('index.html');
  const tomato = read('home/tomato.js');
  const heroAt = html.indexOf('id="home-hero"');
  const chatAt = html.indexOf('id="card-chat"');
  const leaderboardAt = html.indexOf('id="card-leaderboard"');

  assert.ok(heroAt >= 0);
  assert.ok(chatAt > heroAt);
  assert.ok(leaderboardAt > chatAt);
  assert.match(tomato, /renderLifeZoneSummary/);
  assert.match(tomato, /lifeZoneCard\.append\(chatCard\)/);
  assert.match(tomato, /lifeZoneCard\.after\(summaryCard\)/);
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
  assert.doesNotMatch(html, /LIVE CHAT|home-chat-header|home-chat-title-group/);
  assert.match(html, /id="home-chat-notices"/);
  assert.match(dataSource, /CHAT_NOTICE_PREFIX = '<공지>'/);
  assert.match(homeSource, /bubble\.textContent =/);
  assert.match(homeSource, /channel\.textContent = message\.isNotice \? '\[공지\]' : '\[전체\]'/);
  assert.match(homeSource, /message\.isNotice \? noticeFragment : messageFragment/);
  assert.match(homeSource, /notices\.replaceChildren\(noticeFragment\)/);
  assert.match(homeSource, /message\.userId === currentUserId/);
  assert.match(homeSource, /_deleteOwnMessage\(message\.id, deleteButton\)/);
  assert.match(css, /\.home-chat-message\.is-notice \.home-chat-bubble/);
  assert.match(css, /grid-template-columns: auto minmax\(34px, auto\) minmax\(0, 1fr\) auto/);
  assert.match(css, /align-content: end/);
  assert.match(css, /\.home-chat-notices:empty/);
  assert.match(css, /#card-chat\.home-chat-card \{/);
  assert.match(css, /margin-top: -8%/);
  assert.match(css, /backdrop-filter: blur\(10px\)/);
  assert.match(css, /background: linear-gradient\(180deg, rgba\(11, 15, 22, 0\.76\), rgba\(9, 13, 19, 0\.88\)\)/);
});
