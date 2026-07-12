import {
  calcStreaks,
  getCurrentUser,
  getMyNotifications,
  getGlobalGuildWeeklyRanking,
} from '../data.js';
import { showConfetti, haptic } from './utils.js';

const WELCOME_BACK_DATA_TIMEOUT_MS = 2500;

function _withWelcomeDataTimeout(promise, fallback, label) {
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[welcome-back] ${label} timed out; using cached fallback`);
      resolve(fallback);
    }, WELCOME_BACK_DATA_TIMEOUT_MS);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => { if (timer) clearTimeout(timer); }),
    timeout,
  ]);
}

function _localDateKey() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function _pickMessage(hoursSinceLogin, user, notifications, guildRanking) {
  const daysAway = hoursSinceLogin / 24;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const primaryGuild = user.primaryGuild || (user.guilds || [])[0];
  const guildRank = primaryGuild
    ? (guildRanking?.rankings || []).findIndex((item) => item.guildId === primaryGuild || item.guildName === primaryGuild) + 1
    : 0;
  const fromName = notifications.find((item) => item.fromName)?.fromName || notifications.find((item) => item.userName)?.userName || '이웃';
  const streaks = calcStreaks();
  const mainStreak = streaks.combined;

  if (daysAway < 3) {
    return `${fromName}님도 최근에 기록했어요. 다시 만나서 반가워요.`;
  }
  if (daysAway < 7) {
    return unreadCount > 0
      ? `${fromName}님 관련 알림이 ${unreadCount}개 있어요. 다시 둘러볼까요?`
      : `${fromName}님이 기다리고 있었어요. 다시 만나서 반가워요.`;
  }
  if (mainStreak > 0) {
    return `돌아와서 기록하면 ${mainStreak + 1}일째예요. 다시 흐름을 붙여볼까요?`;
  }
  if (primaryGuild && guildRank > 0) {
    return `새로운 1일차를 시작해볼까요? 지금 ${primaryGuild}은 ${guildRank}위예요.`;
  }
  return '다시 시작하는 것도 대단한 거예요. 오늘 한 줄부터 남겨볼까요?';
}

function _getCelebrationLevel(hoursSinceLogin) {
  const daysAway = hoursSinceLogin / 24;
  if (daysAway < 3) return 'mild';
  if (daysAway < 7) return 'moderate';
  return 'full';
}

function _formatAbsence(hoursSinceLogin) {
  const daysAway = Math.max(0, hoursSinceLogin / 24);
  if (daysAway < 1) return '오늘도 돌아왔어요';
  if (daysAway < 3) return `${Math.max(1, Math.round(daysAway))}일 만이에요`;
  if (daysAway < 7) return `${Math.max(1, Math.round(daysAway))}일이나 기다렸어요`;
  if (daysAway < 14) return `${Math.max(1, Math.round(daysAway))}일... 보고 싶었어요`;
  if (daysAway < 30) return `${Math.max(1, Math.round(daysAway / 7))}주 만이에요!`;
  return `${Math.max(1, Math.round(daysAway))}일 만의 복귀!`;
}

function _getTitle(level) {
  if (level === 'full') return '드디어 돌아왔네요!';
  if (level === 'moderate') return '다시 돌아왔네요!';
  return '다시 돌아왔네요';
}

function _showWelcomeConfetti(level) {
  if (level === 'mild') {
    showConfetti(2000);
    return;
  }
  if (level === 'moderate') {
    showConfetti(3000);
    return;
  }
  showConfetti(2200);
  setTimeout(() => showConfetti(4000), 700);
}

function _dismissWelcomeBack() {
  const host = document.getElementById('dynamic-modal');
  const overlay = host?.querySelector('.wb-overlay');
  if (!host || !overlay) return;
  if (overlay.classList.contains('is-closing')) return;
  overlay.classList.add('is-closing');
  setTimeout(() => host.remove(), 220);
}

export async function showWelcomeBackPopup(hoursSinceLogin, options = {}) {
  const user = getCurrentUser();
  const rawThreshold = user?.welcomeBackThresholdHours;
  const thresholdHours = Math.max(0, Number(rawThreshold ?? 24));
  if (!user || hoursSinceLogin < thresholdHours) return false;

  const storageKey = `welcome_back_seen_${user.id}_${_localDateKey()}`;
  if (sessionStorage.getItem(storageKey)) return false;
  sessionStorage.setItem(storageKey, '1');

  const [notifications, guildRanking] = await Promise.all([
    _withWelcomeDataTimeout(getMyNotifications(), [], 'notifications'),
    _withWelcomeDataTimeout(getGlobalGuildWeeklyRanking(), null, 'guild ranking'),
  ]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const level = _getCelebrationLevel(hoursSinceLogin);
  const title = (user.welcomeBackCustomTitle || '').trim() || _getTitle(level);
  const absenceText = (user.welcomeBackCustomBadge || '').trim() || _formatAbsence(hoursSinceLogin);
  const message = (user.welcomeBackCustomMessage || '').trim() || _pickMessage(hoursSinceLogin, user, notifications, guildRanking);
  const guildLabel = user.primaryGuild ? `내 길드 ${user.primaryGuild}` : '길드 미가입';
  const sparkle = level === 'full' ? '✨⭐' : level === 'moderate' ? '✨' : '';

  document.getElementById('cheer-card-overlay')?.remove();
  document.getElementById('dynamic-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'dynamic-modal';
  modal.innerHTML = `
    <div class="wb-overlay">
      <div class="wb-card wb-card--${level}" role="dialog" aria-modal="true" aria-label="복귀 환영">
        <button type="button" class="wb-close" data-wb-action="dismiss" aria-label="닫기">×</button>
        <div class="wb-mascot-wrap">
          <div class="wb-mascot wb-mascot--${level}">
            <div class="wb-mascot-stem"></div>
            <div class="wb-mascot-leaf wb-mascot-leaf--left"></div>
            <div class="wb-mascot-leaf wb-mascot-leaf--right"></div>
            <div class="wb-mascot-eye wb-mascot-eye--left"></div>
            <div class="wb-mascot-eye wb-mascot-eye--right"></div>
            <div class="wb-mascot-smile"></div>
          </div>
        </div>
        <div class="wb-title-wrap">
          <div class="wb-title">${title}</div>
          <div class="wb-badge">${absenceText}${sparkle ? ` <span>${sparkle}</span>` : ''}</div>
        </div>
        <div class="wb-message">${message}</div>
        <div class="wb-stats">
          <div class="wb-stat">
            <div class="wb-stat-label">읽지 않은 알림</div>
            <div class="wb-stat-value">${unreadCount}개</div>
          </div>
          <div class="wb-stat">
            <div class="wb-stat-label">길드</div>
            <div class="wb-stat-value">${guildLabel}</div>
          </div>
        </div>
        <div class="wb-actions">
          <button type="button" class="tds-btn fill lg" data-wb-action="start-workout">오늘 기록 시작하기</button>
          <button type="button" class="tds-btn ghost md" data-wb-action="dismiss">나중에 할게요</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const overlay = modal.querySelector('.wb-overlay');
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) _dismissWelcomeBack();
  });
  modal.addEventListener('click', (event) => {
    const control = event.target?.closest?.('[data-wb-action]');
    if (!control) return;
    const action = control.dataset.wbAction;
    _dismissWelcomeBack();
    if (action === 'start-workout') options.onStartWorkout?.();
  });
  modal.querySelector('[data-wb-action="dismiss"]')?.focus({ preventScroll: true });

  setTimeout(() => _showWelcomeConfetti(level), 350);
  setTimeout(() => haptic(level === 'full' ? 'celebration' : level === 'moderate' ? 'success' : 'light'), 400);
  return true;
}
