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
  if (!list) return;
  if (!messages.length) {
    _appendEmptyState(list, '아직 대화가 없어요. 첫 메시지를 남겨보세요.');
    _hasRenderedMessages = true;
    return;
  }

  const currentUserId = getCurrentUser()?.id || '';
  const wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 72;
  const fragment = document.createDocumentFragment();

  messages.forEach((message) => {
    const item = document.createElement('article');
    item.className = 'home-chat-message';
    if (message.userId === currentUserId) item.classList.add('is-mine');
    if (message.isNotice) item.classList.add('is-notice');

    const channel = document.createElement('span');
    channel.className = 'home-chat-channel';
    channel.textContent = message.isNotice ? '[공지]' : '[전체]';

    const author = document.createElement('span');
    author.className = 'home-chat-author';
    author.textContent = String(message.userName || message.userId || '이용자');

    const time = document.createElement('time');
    time.className = 'home-chat-time';
    time.dateTime = Number.isFinite(Number(message.createdAt))
      ? new Date(Number(message.createdAt)).toISOString()
      : '';
    time.textContent = _formatChatTime(message.createdAt);

    const bubble = document.createElement('div');
    bubble.className = 'home-chat-bubble';
    bubble.textContent = String(message.message || '');

    const tail = document.createElement('div');
    tail.className = 'home-chat-tail';
    tail.append(time);
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

    item.append(channel, author, bubble, tail);
    fragment.append(item);
  });

  list.replaceChildren(fragment);
  if (!_hasRenderedMessages || wasNearBottom || _awaitingOwnMessage) {
    list.scrollTop = list.scrollHeight;
  }
  _awaitingOwnMessage = false;
  _hasRenderedMessages = true;
}

function _setStatus(text, state = '') {
  const status = document.getElementById('home-chat-status');
  if (!status) return;
  status.textContent = text;
  status.className = `home-chat-status${state ? ` is-${state}` : ''}`;
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
    await sendChatMessage(draft);
    form.reset();
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
    _setStatus('실시간', 'connected');
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
  _bindChatForm();
  _subscribeForCurrentUser();
}
