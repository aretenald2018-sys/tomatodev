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

const feedJs = read('home/friend-feed.js');
const swJs = read('sw.js');

test('friend feed uses one scoped data action bridge', () => {
  assert.match(feedJs, /function _bindFriendFeedActions\(root = document\)/);
  assert.match(feedJs, /friendFeedActionsBound/);
  assert.match(feedJs, /\[data-feed-action\]/);
  assert.match(feedJs, /Promise\.resolve\(_runFriendFeedAction\(control\.dataset\.feedAction, control, event\)\)/);
  assert.doesNotMatch(feedJs, /\sonclick=/);
  assert.doesNotMatch(feedJs, /\.onclick\s*=/);
});

test('friend feed primary actions are routed through data-feed-action', () => {
  const feed = sliceBetween(feedJs, 'export async function renderFriendFeed()', '// ── 친구 관리 모달');

  assert.match(feedJs, /data-feed-action="quick-add-neighbor"/);

  for (const action of [
    'accept-friend-request',
    'reject-friend-request',
    'open-meal-photo',
    'send-cheer',
    'open-profile',
    'open-gift',
    'select-feed-page',
    'toggle-inactive-friends',
  ]) {
    assert.match(feed, new RegExp(`data-feed-action="${action}"`));
  }
});

test('friend manager modal actions are local and inline-free', () => {
  const manager = sliceBetween(feedJs, 'window.openFriendManager = async function()', 'window.sendFriendReq = async function()');

  assert.match(feedJs, /function _bindFriendManagerActions\(modal\)/);
  assert.match(manager, /_bindFriendManagerActions\(modal\)/);
  assert.match(manager, /data-feed-action="introduce-friend"/);
  assert.match(manager, /data-feed-action="edit-friend-nickname"/);
  assert.match(manager, /data-feed-action="delete-friend"/);
  assert.match(manager, /data-feed-action="send-friend-request"/);
  assert.match(manager, /data-feed-action="close-dynamic-modal"/);
  assert.doesNotMatch(manager, /\sonclick=/);
});

test('reaction picker options inherit the feed action contract', () => {
  const picker = sliceBetween(feedJs, 'window.showReactionPicker = function', 'window.showReactionDetail = async function');

  assert.match(picker, /data-feed-action="send-reaction"/);
  assert.match(picker, /data-target-id="\$\{_feedAttr\(tid\)\}"/);
  assert.match(picker, /data-emoji="\$\{_feedAttr\(r\.emoji\)\}"/);
  assert.doesNotMatch(picker, /\sonclick=/);
});

test('service worker cache version was bumped for social feed actions', () => {
  assert.match(swJs, /tomatofarm-v20260706z1-running-gps-full-route/);
});
