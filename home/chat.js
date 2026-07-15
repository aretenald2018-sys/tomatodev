// ================================================================
// home/chat.js — 홈 실시간 채팅 카드
// ================================================================

import {
  deleteChatMessage,
  getCurrentUser,
  sendChatMessage,
  subscribeChatMessages,
} from '../data.js';
import { showToast } from './utils.js';
import { confirmSimple } from '../utils/confirm-modal.js';

let _unsubscribe = null;
let _subscribedUserId = '';
let _hasRenderedMessages = false;
let _awaitingOwnMessage = false;
let _activeChannel = 'all';
let _messages = [];

const CHAT_CHANNELS = Object.freeze({
  all: '전체',
  notice: '공지',
  bug: '버그제보',
  free: '자유',
});

const CHAT_AVATAR_FACES = Object.freeze([
  { skin: '#f1bd91', hair: '#2f211d' },
  { skin: '#e4a978', hair: '#151515' },
  { skin: '#f6cda8', hair: '#5a3425' },
  { skin: '#bb7652', hair: '#231713' },
  { skin: '#d89468', hair: '#3a2720' },
]);

const CHAT_AVATAR_OUTFITS = Object.freeze([
  { shirt: '#ef4444', accent: '#7f1d1d' },
  { shirt: '#2563eb', accent: '#172554' },
  { shirt: '#16a34a', accent: '#14532d' },
  { shirt: '#f59e0b', accent: '#78350f' },
  { shirt: '#9333ea', accent: '#581c87' },
  { shirt: '#334155', accent: '#0f172a' },
]);

function _chatHash(value) {
  let hash = 0;
  for (const character of String(value || 'tomato')) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function _messageChannel(message = {}) {
  if (message.isNotice || String(message.message || '').trimStart().startsWith('<공지>')) return 'notice';
  return CHAT_CHANNELS[message.channel] && message.channel !== 'all' ? message.channel : 'free';
}

function _messageText(message = {}) {
  const text = String(message.message || '');
  return _messageChannel(message) === 'notice' ? text.replace(/^\s*<공지>\s*/, '') : text;
}

function _createAvatar(message = {}) {
  const seed = `${message.userId || message.userName || ''}:${message.avatar?.face || ''}:${message.avatar?.outfit || ''}`;
  const hash = _chatHash(seed);
  const face = CHAT_AVATAR_FACES[hash % CHAT_AVATAR_FACES.length];
  const outfitHash = _chatHash(`${seed}:outfit`);
  const outfit = CHAT_AVATAR_OUTFITS[outfitHash % CHAT_AVATAR_OUTFITS.length];
  const avatar = document.createElement('span');
  avatar.className = 'home-chat-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.style.setProperty('--chat-skin', face.skin);
  avatar.style.setProperty('--chat-hair', face.hair);
  avatar.style.setProperty('--chat-shirt', outfit.shirt);
  avatar.style.setProperty('--chat-shirt-accent', outfit.accent);
  avatar.innerHTML = `
    <span class="home-chat-avatar-outfit"><span class="home-chat-avatar-collar"></span></span>
    <span class="home-chat-avatar-ear home-chat-avatar-ear--left"></span>
    <span class="home-chat-avatar-ear home-chat-avatar-ear--right"></span>
    <span class="home-chat-avatar-face">
      <span class="home-chat-avatar-hair"></span>
      <span class="home-chat-avatar-eye home-chat-avatar-eye--left"></span>
      <span class="home-chat-avatar-eye home-chat-avatar-eye--right"></span>
      <span class="home-chat-avatar-mouth"></span>
    </span>
  `;
  return avatar;
}

function _formatChatTime(createdAt) {
  const date = new Date(Number(createdAt));
  if (!Number.isFinite(date.getTime())) return '';

  const now = new Date();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const isToday = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return isToday ? time : `${date.getMonth() + 1}.${date.getDate()}. ${time}`;
}

function _appendEmptyState(list, message) {
  if (!list) return;
  const empty = document.createElement('div');
  empty.className = 'home-chat-empty';
  empty.textContent = message;
  list.replaceChildren(empty);
}

function _createMessageRow(message, currentUserId) {
  const item = document.createElement('article');
  item.className = 'home-chat-message';
  if (message.userId === currentUserId) item.classList.add('is-mine');
  const messageChannel = _messageChannel(message);
  if (messageChannel === 'notice') item.classList.add('is-notice');

  const avatar = _createAvatar(message);

  const body = document.createElement('div');
  body.className = 'home-chat-message-body';

  const meta = document.createElement('div');
  meta.className = 'home-chat-message-meta';

  const author = document.createElement('span');
  author.className = 'home-chat-author';
  author.textContent = String(message.userName || message.userId || '이용자');

  const channel = document.createElement('span');
  channel.className = `home-chat-channel is-${messageChannel}`;
  channel.textContent = CHAT_CHANNELS[messageChannel];

  const time = document.createElement('time');
  time.className = 'home-chat-time';
  time.dateTime = Number.isFinite(Number(message.createdAt))
    ? new Date(Number(message.createdAt)).toISOString()
    : '';
  time.textContent = _formatChatTime(message.createdAt);

  const bubble = document.createElement('div');
  bubble.className = 'home-chat-bubble';
  bubble.textContent = _messageText(message);

  const tail = document.createElement('div');
  tail.className = 'home-chat-tail';
  if (message.userId === currentUserId) {
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'home-chat-delete';
    deleteButton.textContent = '삭제';
    deleteButton.setAttribute('aria-label', `${author.textContent}님의 메시지 삭제`);
    deleteButton.addEventListener('click', () => {
      void _deleteOwnMessage(message.id, deleteButton);
    });
    tail.append(deleteButton);
  }

  meta.append(author, channel, time, tail);
  body.append(meta, bubble);
  item.append(avatar, body);
  return item;
}

async function _deleteOwnMessage(messageId, button) {
  const confirmed = await confirmSimple('보낸 메시지를 삭제할까요?');
  if (!confirmed) return;

  button.disabled = true;
  try {
    await deleteChatMessage(messageId);
    showToast('메시지를 삭제했어요.', 1800, 'success');
  } catch (error) {
    button.disabled = false;
    showToast(error?.message || '메시지를 삭제하지 못했어요.', 2400, 'error');
  }
}

function _renderMessages(messages) {
  const list = document.getElementById('home-chat-list');
  const notices = document.getElementById('home-chat-notices');
  if (!list || !notices) return;
  _messages = messages;
  _renderChannelCounts(messages);
  _renderPinnedNotice(messages, notices);
  _renderPresence(messages);
  if (!messages.length) {
    _appendEmptyState(list, '아직 대화가 없어요. 첫 메시지를 남겨보세요.');
    _hasRenderedMessages = true;
    return;
  }

  const currentUserId = getCurrentUser()?.id || '';
  const wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 72;
  const messageFragment = document.createDocumentFragment();
  const filteredMessages = messages.filter((message) => (
    _activeChannel === 'all' || _messageChannel(message) === _activeChannel
  ));
  filteredMessages.slice(-40).forEach((message) => {
    messageFragment.append(_createMessageRow(message, currentUserId));
  });

  list.replaceChildren(messageFragment);
  if (!list.childElementCount) {
    _appendEmptyState(list, `아직 ${CHAT_CHANNELS[_activeChannel]} 대화가 없어요.`);
  }
  list.setAttribute('aria-label', `${CHAT_CHANNELS[_activeChannel]} 채팅 기록`);
  if (!_hasRenderedMessages || wasNearBottom || _awaitingOwnMessage) {
    list.scrollTop = list.scrollHeight;
  }
  _awaitingOwnMessage = false;
  _hasRenderedMessages = true;
}

function _renderPinnedNotice(messages, notices) {
  const latestNotice = [...messages].reverse().find(message => _messageChannel(message) === 'notice');
  if (!latestNotice) {
    notices.replaceChildren();
    return;
  }

  const pin = document.createElement('span');
  pin.className = 'home-chat-notice-pin';
  pin.textContent = '📌';
  pin.setAttribute('aria-hidden', 'true');
  const label = document.createElement('strong');
  label.textContent = '공지';
  const author = document.createElement('span');
  author.className = 'home-chat-notice-author';
  author.textContent = String(latestNotice.userName || latestNotice.userId || '운영자');
  const message = document.createElement('span');
  message.className = 'home-chat-notice-message';
  message.textContent = _messageText(latestNotice);
  notices.replaceChildren(pin, label, author, message);
}

function _renderChannelCounts(messages) {
  const counts = { notice: 0, bug: 0, free: 0 };
  messages.forEach((message) => { counts[_messageChannel(message)] += 1; });
  Object.entries(counts).forEach(([channel, count]) => {
    const target = document.querySelector(`[data-chat-count="${channel}"]`);
    if (target) target.textContent = count ? String(Math.min(count, 99)) + (count > 99 ? '+' : '') : '';
  });
}

function _renderPresence(messages) {
  const presence = document.getElementById('home-chat-presence');
  if (!presence) return;
  const label = presence.querySelector('.home-chat-presence-label');
  const avatarList = presence.querySelector('.home-chat-presence-avatars');
  const participants = [];
  const seen = new Set();
  [...messages].reverse().forEach((message) => {
    const key = String(message.userId || message.userName || '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    participants.push(message);
  });
  if (label) label.textContent = `대화 참여 ${participants.length}명`;
  if (!avatarList) return;
  const fragment = document.createDocumentFragment();
  participants.slice(0, 6).forEach((message) => fragment.append(_createAvatar(message)));
  if (participants.length > 6) {
    const more = document.createElement('span');
    more.className = 'home-chat-presence-more';
    more.textContent = `+${participants.length - 6}`;
    fragment.append(more);
  }
  avatarList.replaceChildren(fragment);
}

function _syncChannelUi() {
  document.querySelectorAll('[data-chat-channel]').forEach((button) => {
    const isActive = button.dataset.chatChannel === _activeChannel;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  const input = document.getElementById('home-chat-input');
  const sendChannel = _activeChannel === 'all' ? 'free' : _activeChannel;
  if (input) input.placeholder = `${CHAT_CHANNELS[sendChannel]} 메시지를 입력하세요`;
}

function _bindChannelTabs() {
  document.querySelectorAll('[data-chat-channel]').forEach((button) => {
    if (button.dataset.chatBound === '1') return;
    button.dataset.chatBound = '1';
    button.addEventListener('click', () => {
      const channel = button.dataset.chatChannel;
      if (!CHAT_CHANNELS[channel] || channel === _activeChannel) return;
      _activeChannel = channel;
      _hasRenderedMessages = false;
      _syncChannelUi();
      _renderMessages(_messages);
    });
  });
  _syncChannelUi();
}

function _setStatus(text, state = '') {
  const status = document.getElementById('home-chat-status');
  if (!status) return;
  status.textContent = text;
  status.className = `tds-sr-only home-chat-status${state ? ` is-${state}` : ''}`;
}

async function _submitChat(form) {
  const input = document.getElementById('home-chat-input');
  const button = document.getElementById('home-chat-send');
  if (!input || !button || button.disabled) return;

  const draft = input.value.trim();
  if (!draft) {
    showToast('메시지를 입력해주세요.', 1800, 'warning');
    input.focus();
    return;
  }

  button.disabled = true;
  input.disabled = true;
  _awaitingOwnMessage = true;
  try {
    const sendChannel = _activeChannel === 'all' ? 'free' : _activeChannel;
    await sendChatMessage(draft, sendChannel);
    form.reset();
    _syncChannelUi();
  } catch (error) {
    _awaitingOwnMessage = false;
    showToast(error?.message || '메시지를 보내지 못했어요.', 2600, 'error');
  } finally {
    button.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

function _bindChatForm() {
  const form = document.getElementById('home-chat-form');
  if (!form || form.dataset.chatBound === '1') return;
  form.dataset.chatBound = '1';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void _submitChat(form);
  });
}

function _bindEmojiButton() {
  const button = document.getElementById('home-chat-emoji');
  const input = document.getElementById('home-chat-input');
  if (!button || !input || button.dataset.chatBound === '1') return;
  button.dataset.chatBound = '1';
  button.addEventListener('click', () => {
    if (input.value.length + 2 <= Number(input.maxLength || 300)) input.value += '😊';
    input.focus();
  });
}

function _subscribeForCurrentUser() {
  const user = getCurrentUser();
  const userId = user?.id || '';
  if (!userId) {
    _unsubscribe?.();
    _unsubscribe = null;
    _subscribedUserId = '';
    _appendEmptyState(document.getElementById('home-chat-list'), '로그인 후 채팅할 수 있어요.');
    _setStatus('로그인 필요');
    return;
  }
  if (_unsubscribe && _subscribedUserId === userId) return;

  _unsubscribe?.();
  _subscribedUserId = userId;
  _hasRenderedMessages = false;
  _setStatus('연결 중');
  _unsubscribe = subscribeChatMessages((messages) => {
    _renderMessages(messages);
    _setStatus('연결됨', 'connected');
  }, () => {
    _setStatus('연결 확인 필요', 'error');
    const list = document.getElementById('home-chat-list');
    if (list && !_hasRenderedMessages) {
      _appendEmptyState(list, '채팅을 불러오지 못했어요. 연결 상태를 확인해주세요.');
    }
  });
}

export function renderHomeChat() {
  if (!document.getElementById('card-chat')) return;
  _bindChannelTabs();
  _bindEmojiButton();
  _bindChatForm();
  _subscribeForCurrentUser();
}
