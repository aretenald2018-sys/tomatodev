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

const friendProfileJs = read('home/friend-profile.js');
const swJs = read('sw.js');

test('friend profile modal routes primary social actions through a scoped delegate', () => {
  assert.match(friendProfileJs, /function _socialAttr\(value\)/);
  assert.match(friendProfileJs, /function _bindFriendProfileActions\(root\)/);
  assert.match(friendProfileJs, /root\.addEventListener\('click', \(event\) => \{[\s\S]*target\.closest\?\.\('\[data-social-action\]'\)[\s\S]*\}, true\)/);
  assert.match(friendProfileJs, /root\.addEventListener\('keydown', \(event\) => \{[\s\S]*data-social-enter-action[\s\S]*window\.submitGuestbook\?\.\(targetId\)/);
  assert.match(friendProfileJs, /case 'quick-add-neighbor':[\s\S]*window\.quickAddNeighbor\?\.\(friendId\)/);
  assert.match(friendProfileJs, /case 'open-introduce-friend':[\s\S]*window\.openIntroduceFriend\?\.\(friendId, friendName \|\| ''\)/);
  assert.match(friendProfileJs, /case 'open-guild-invite':[\s\S]*window\.openGuildInvite\?\.\(friendId, friendName \|\| ''\)/);
  assert.match(friendProfileJs, /case 'open-tomato-gift':[\s\S]*window\.openTomatoGiftModal\?\.\(friendId, friendName \|\| ''\)/);
  assert.match(friendProfileJs, /case 'toggle-comment':[\s\S]*window\.toggleCommentSection\?\.\(targetId, dk, section\)/);
  assert.match(friendProfileJs, /case 'show-reaction-picker':[\s\S]*window\.showReactionPicker\?\.\(control, targetId, dk, field\)/);
  assert.match(friendProfileJs, /case 'show-reaction-detail':[\s\S]*window\.showReactionDetail\?\.\(control, targetId, dk, field\)/);
  assert.match(friendProfileJs, /case 'submit-comment':[\s\S]*window\.submitComment\?\.\(targetId, dk, section\)/);
  assert.match(friendProfileJs, /case 'edit-comment':[\s\S]*window\.editCommentUI\?\.\(commentId, targetId, dk, section\)/);
  assert.match(friendProfileJs, /case 'confirm-edit-comment':[\s\S]*window\.confirmEditComment\?\.\(commentId, targetId, dk, section\)/);
  assert.match(friendProfileJs, /case 'delete-comment':[\s\S]*window\.deleteCommentUI\?\.\(commentId, targetId, dk, section\)/);
  assert.match(friendProfileJs, /case 'cancel-comment-reply':[\s\S]*_cancelCommentReply\(section\)/);
  assert.match(friendProfileJs, /case 'start-gb-reply':[\s\S]*window\.startGbReply\?\.\(entryId, fromName \|\| ''\)/);
  assert.match(friendProfileJs, /case 'delete-gb':[\s\S]*window\.deleteGb\?\.\(entryId, targetId\)/);
  assert.match(friendProfileJs, /case 'open-friend-profile':[\s\S]*window\.openFriendProfile\?\.\(friendId, friendName \|\| '익명'\)/);
  assert.match(friendProfileJs, /data-social-enter-action[\s\S]*submit-comment[\s\S]*window\.submitComment\?\.\(targetId, dk, section\)/);
  assert.match(friendProfileJs, /data-social-enter-action[\s\S]*confirm-edit-comment[\s\S]*window\.confirmEditComment\?\.\(commentId, targetId, dk, section\)/);
});

test('profile modal markup uses data social actions instead of inline primary handlers', () => {
  const modalMarkup = sliceBetween(friendProfileJs, 'modal.innerHTML = `<div class="modal-backdrop"', '_bindFriendProfileActions(modal);');
  const dietRowMarkup = sliceBetween(friendProfileJs, 'const photoThumb = photo ?', 'todayDietHtml +=');

  assert.match(modalMarkup, /data-social-backdrop/);
  assert.match(modalMarkup, /data-social-action="quick-guild-join"/);
  assert.match(modalMarkup, /data-social-action="quick-add-neighbor"/);
  assert.match(modalMarkup, /data-social-action="open-introduce-friend"/);
  assert.match(modalMarkup, /data-social-action="open-guild-invite"/);
  assert.match(modalMarkup, /data-social-action="open-tomato-gift"/);
  assert.match(modalMarkup, /data-social-action="submit-guestbook"/);
  assert.match(modalMarkup, /data-social-enter-action="submit-guestbook"/);
  assert.match(modalMarkup, /data-social-action="toggle-comment"/);
  assert.match(modalMarkup, /data-social-action="show-reaction-picker"/);
  assert.match(modalMarkup, /data-social-action="show-reaction-detail"/);
  assert.match(dietRowMarkup, /data-social-action="open-meal-photo"/);
  assert.match(dietRowMarkup, /data-social-action="show-reaction-picker"/);
  assert.match(dietRowMarkup, /data-social-action="show-reaction-detail"/);
  assert.match(modalMarkup, /data-social-action="close-dynamic-modal"/);
  assert.match(friendProfileJs, /_bindFriendProfileActions\(modal\);\s*\n\s*loadGuestbook\(normalizedFriendId\)/);

  assert.doesNotMatch(modalMarkup, /onclick="quickAddNeighbor/);
  assert.doesNotMatch(modalMarkup, /onclick="openIntroduceFriend/);
  assert.doesNotMatch(modalMarkup, /onclick="openGuildInvite/);
  assert.doesNotMatch(modalMarkup, /onclick="openTomatoGiftModal/);
  assert.doesNotMatch(modalMarkup, /onclick="submitGuestbook/);
  assert.doesNotMatch(modalMarkup, /onclick="toggleCommentSection/);
  assert.doesNotMatch(modalMarkup, /onclick="showReactionPicker/);
  assert.doesNotMatch(modalMarkup, /showReactionDetail\(this/);
  assert.doesNotMatch(dietRowMarkup, /onclick="event\.stopPropagation\(\);openMealPhotoLightbox/);
  assert.doesNotMatch(dietRowMarkup, /showReactionDetail\(this/);
  assert.doesNotMatch(modalMarkup, /onclick="document\.getElementById\('dynamic-modal'\)\?\.remove\(\)"/);
});

test('async guestbook entries inherit the profile modal delegate contract', () => {
  const guestbookFn = sliceBetween(friendProfileJs, 'async function loadGuestbook(targetId)', 'window.openIntroduceFriend = async function');

  assert.match(guestbookFn, /data-social-action="delete-gb"/);
  assert.match(guestbookFn, /data-social-action="start-gb-reply"/);
  assert.match(guestbookFn, /data-social-action="open-friend-profile"/);
  assert.match(guestbookFn, /data-entry-id="\$\{_socialAttr\(e\.id\)\}"/);
  assert.match(guestbookFn, /data-target-id="\$\{_socialAttr\(targetId\)\}"/);
  assert.match(guestbookFn, /data-from-name="\$\{_socialAttr\(e\.fromName \|\| ''\)\}"/);
  assert.doesNotMatch(guestbookFn, /onclick="deleteGb\('\$\{?e\.id/);
  assert.doesNotMatch(guestbookFn, /onclick="startGbReply\('/);
  assert.doesNotMatch(guestbookFn, /onclick="event\.stopPropagation\(\);document\.getElementById\('dynamic-modal'\)\?\.remove\(\);openFriendProfile/);
});

test('comment reaction and edit actions inherit the profile delegate contract', () => {
  const commentPanel = sliceBetween(friendProfileJs, 'async function loadComments(targetId, dk, section, canWrite = true)', 'function renderComment(c, isReply');
  const commentRender = sliceBetween(friendProfileJs, 'function renderComment(c, isReply', 'window.submitComment = async function');
  const replyFn = sliceBetween(friendProfileJs, 'window.startCommentReply = function', 'window.editCommentUI = function');
  const editFn = sliceBetween(friendProfileJs, 'window.editCommentUI = function', 'window.confirmEditComment = async function');

  assert.match(commentPanel, /data-social-enter-action="submit-comment"/);
  assert.match(commentPanel, /data-social-action="submit-comment"/);
  assert.doesNotMatch(commentPanel, /onkeydown="if\(event\.key==='Enter'\)submitComment/);
  assert.doesNotMatch(commentPanel, /onclick="submitComment/);
  assert.match(commentRender, /data-social-action="open-friend-profile"/);
  assert.match(commentRender, /data-social-action="delete-comment"/);
  assert.match(commentRender, /data-social-action="edit-comment"/);
  assert.match(commentRender, /data-social-action="start-comment-reply"/);
  assert.match(commentRender, /data-comment-id="\$\{_socialAttr\(c\.id\)\}"/);
  assert.match(commentRender, /data-date-key="\$\{_socialAttr\(dk\)\}"/);
  assert.match(commentRender, /data-friend-id="\$\{_socialAttr\(c\.from\)\}"/);
  assert.doesNotMatch(commentRender, /openFriendProfile\('\$\{?c\.from/);
  assert.doesNotMatch(commentRender, /onclick="deleteCommentUI/);
  assert.doesNotMatch(commentRender, /onclick="editCommentUI/);
  assert.doesNotMatch(commentRender, /onclick="startCommentReply/);
  assert.match(replyFn, /cancelBtn\.dataset\.socialAction = 'cancel-comment-reply'/);
  assert.doesNotMatch(replyFn, /cancelBtn\.onclick/);
  assert.match(editFn, /data-social-enter-action="confirm-edit-comment"/);
  assert.match(editFn, /data-social-action="confirm-edit-comment"/);
  assert.doesNotMatch(editFn, /onkeydown="if\(event\.key==='Enter'\)confirmEditComment/);
  assert.doesNotMatch(editFn, /onclick="confirmEditComment/);
});

test('service worker cache version was bumped for social profile action assets', () => {
  assert.match(swJs, /tomatofarm-v20260704z3-running-lock-gps-recovery/);
});
