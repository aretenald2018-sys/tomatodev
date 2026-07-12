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
const swJs = read('sw.js') + read('runtime-assets.js');

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

  const quickAdd = sliceBetween(feedJs, 'export async function quickAddNeighbor', 'export async function editFriendNickname');
  const like = sliceBetween(feedJs, 'export async function friendLike', 'export function showReactionPicker');

  assert.match(quickAdd, /_scheduleFriendFeedRender\('quick-add-neighbor'\)/);
  assert.match(like, /runOptimisticSocialAction/);
  assert.match(like, /refresh:\s*reason => _scheduleFriendFeedRender\(reason\)/);
  assert.match(like, /reason:\s*'friend-like'/);
  assert.doesNotMatch(quickAdd, /renderFriendFeed\(\)/);
  assert.doesNotMatch(like, /renderFriendFeed\(\)/);
});

test('friend profile feed refreshes are scheduled instead of direct dependency calls', () => {
  assert.match(profileJs, /import \{ createSocialRenderScheduler \} from '\.\/social-render-scheduler\.js'/);
  assert.match(profileJs, /const _scheduleFriendProfileFeedRender = createSocialRenderScheduler\(/);

  const reaction = sliceBetween(profileJs, 'export async function sendReaction', 'export async function markNotifRead');
  const notification = sliceBetween(profileJs, 'export async function markNotifRead', 'export function openTomatoGiftModal');

  assert.match(reaction, /runOptimisticSocialAction/);
  assert.match(reaction, /refresh:\s*reason => _scheduleFriendProfileFeedRender\(reason\)/);
  assert.match(reaction, /reason:\s*'profile-reaction'/);
  assert.match(notification, /_scheduleFriendProfileFeedRender\('notification-read'\)/);
  assert.doesNotMatch(reaction, /_renderFriendFeedFn\(\)/);
  assert.doesNotMatch(notification, /_renderFriendFeedFn\(\)/);
});

test('service worker caches social render scheduler assets', () => {
  assert.match(swJs, /const CACHE_VERSION = 'tomatofarm-v\d{8}z\d+-[^']+';/);
  assert.match(swJs, /\.\/home\/social-render-scheduler\.js/);
});
