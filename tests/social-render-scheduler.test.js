import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSocialRenderScheduler } from '../home/social-render-scheduler.js';

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
const profileJs = read('home/friend-profile.js');
const swJs = read('sw.js');

test('social render scheduler coalesces multiple requests into one frame', async () => {
  const calls = [];
  const schedule = createSocialRenderScheduler((reason) => calls.push(reason), 'test render');

  schedule('first');
  schedule('second');
  schedule('third');

  await new Promise(resolve => setTimeout(resolve, 20));

  assert.deepEqual(calls, ['third']);
});

test('friend feed user actions schedule render instead of calling renderFriendFeed directly', () => {
  assert.match(feedJs, /import \{ createSocialRenderScheduler \} from '\.\/social-render-scheduler\.js'/);
  assert.match(feedJs, /const _scheduleFriendFeedRender = createSocialRenderScheduler\(/);

  const quickAdd = sliceBetween(feedJs, 'window.quickAddNeighbor = async function', 'window.editFriendNickname = async function');
  const like = sliceBetween(feedJs, 'window.friendLike = async function', 'window.showReactionPicker = function');

  assert.match(quickAdd, /_scheduleFriendFeedRender\('quick-add-neighbor'\)/);
  assert.match(like, /_scheduleFriendFeedRender\('friend-like'\)/);
  assert.doesNotMatch(quickAdd, /renderFriendFeed\(\)/);
  assert.doesNotMatch(like, /renderFriendFeed\(\)/);
});

test('friend profile feed refreshes are scheduled instead of direct dependency calls', () => {
  assert.match(profileJs, /import \{ createSocialRenderScheduler \} from '\.\/social-render-scheduler\.js'/);
  assert.match(profileJs, /const _scheduleFriendProfileFeedRender = createSocialRenderScheduler\(/);

  const reaction = sliceBetween(profileJs, 'window.sendReaction = async function', 'window.markNotifRead = async function');
  const notification = sliceBetween(profileJs, 'window.markNotifRead = async function', 'window.openTomatoGiftModal = function');

  assert.match(reaction, /_scheduleFriendProfileFeedRender\('profile-reaction'\)/);
  assert.match(notification, /_scheduleFriendProfileFeedRender\('notification-read'\)/);
  assert.doesNotMatch(reaction, /_renderFriendFeedFn\(\)/);
  assert.doesNotMatch(notification, /_renderFriendFeedFn\(\)/);
});

test('service worker caches social render scheduler assets', () => {
  assert.match(swJs, /tomatofarm-v20260706z5-workout-carousel-focus/);
  assert.match(swJs, /\.\/home\/social-render-scheduler\.js/);
});
