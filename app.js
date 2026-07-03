// ================================================================
// app.js — 앱 진입점
// ================================================================

import { loadAll, TODAY, getTabOrder,
         getRawVisibleTabs, DEFAULT_VIS_TABS,
         isAdmin, isAdminGuest, trackEvent } from './data.js';
import { loadCSVDatabase } from './fatsecret-api.js';
import { getDietRec, getWorkoutRec,
         analyzeGoalFeasibility }                 from './ai.js';
// ── 분리된 모듈 ──
import './feature-nutrition.js';
import './feature-diet-plan.js';
import './feature-checkin.js';
import './feature-misc.js';
import './workout-ui.js';
import './workout/expert.js?v=20260516v6';  // 전문가 모드 (window.* 노출 + 렌더)
import { showTutorialIfNeeded } from './feature-tutorial.js';
import { initFCM, installPWA, showPWAInstallBanner, updateInstallBtn } from './pwa-fcm.js';
import {
  initTabDrag,
  initSwipeNavigation,
  applyTabOrder,
  applyVisibleTabs,
  openTabSettingsModal,
  closeTabSettingsModal,
  saveTabSettingsFromModal
} from './navigation.js';
import { initUxPolish } from './utils/ux-polish.js';
import { initActionRouter } from './utils/action-router.js';
import { initBuildInfoSurface } from './utils/build-info.js?v=20260528a';
import {
  enableWorkoutPwaHistory,
  getWorkoutNavSnapshot,
  handleWorkoutBack,
  openWorkoutCalendar,
  openWorkoutDaySheet,
  subscribeWorkoutNav,
} from './workout/navigation-stack.js';
import './utils/confirm-modal.js'; // window.confirmAction / confirmSimple 등록
import './utils/form-guard.js';    // window.createFormGuard / registerFormGuard 등록
import './utils/format.js';        // window.fmtKcal / fmtDate 등 로케일 포맷
import './utils/haptics.js';       // window.haptic.light/medium/heavy (Capacitor + web fallback)
try { initBuildInfoSurface(); } catch (e) { console.warn('[app] build info init 실패:', e); }
// ── 코어 탭 (즉시 로드) ──
import { renderHome, refreshNotifCenter, showToast } from './render-home.js';
import { setLifeZoneVisitContext } from './home/life-zone.js';
import { showWelcomeBackPopup } from './home/welcome-back.js';
import { showDietPremiumReportIfNeeded } from './feature-diet-premium-report.js';
import {
  loadWorkoutDate, changeWorkoutDate, goToTodayWorkout, saveWorkoutDay,
  openNutritionPhotoUpload, wtRecoverTimers,
} from './render-workout.js?v=20260702z19-current-user-set-button';

// ── 레이지 로딩 탭 캐시 ──
const _lazyModules = {};
async function _lazy(name, path) {
  if (!_lazyModules[name]) _lazyModules[name] = await import(path);
  return _lazyModules[name];
}

function _withTimeout(promise, ms, label) {
  let timer = null;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => {
      console.warn(`[init] ${label} timed out after ${ms}ms; continuing with available local state`);
      resolve(null);
    }, ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => { if (timer) clearTimeout(timer); }),
    timeout,
  ]);
}

// ── 탭 스켈레톤 삽입 (레이지 로드 피드백) ──
function _showTabSkeleton(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab) return;
  // 이미 실제 콘텐츠가 있으면 건너뛰기 (초기 1회만 노출)
  if (tab.dataset.rendered === '1') return;
  if (tab.querySelector('.tds-tab-loader')) return;
  const loader = document.createElement('div');
  loader.className = 'tds-tab-loader';
  loader.innerHTML = `
    <div class="tds-skeleton-card"></div>
    <div class="tds-skeleton-title"></div>
    <div class="tds-skeleton-subtitle"></div>
    <div class="tds-skeleton-card"></div>
  `;
  tab.prepend(loader);
}
function _hideTabSkeleton(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab) return;
  tab.querySelector('.tds-tab-loader')?.remove();
  tab.dataset.rendered = '1';
}

// ── 레이지 프록시: 탭 전환 시 모듈 로드, window.* 자동 등록 ──
async function _lazyRenderStats()   { _showTabSkeleton('tab-stats');   try { const m = await _lazy('stats',   './render-stats.js');              m.renderStats();   return m; } finally { _hideTabSkeleton('tab-stats'); } }
async function _lazyRenderAdmin()   { _showTabSkeleton('tab-admin');   try { const m = await _lazy('admin',   './render-admin.js?v=20260410e');  m.renderAdmin();   return m; } finally { _hideTabSkeleton('tab-admin'); } }
async function _lazyRenderCooking() { _showTabSkeleton('tab-cooking'); try { const m = await _lazy('cooking', './render-cooking.js');            m.renderCooking(); return m; } finally { _hideTabSkeleton('tab-cooking'); } }
async function _lazyRenderCalendar(){ _showTabSkeleton('tab-calendar');try { const m = await _lazy('calendar',  './render-calendar.js');           m.renderCalendar();return m; } finally { _hideTabSkeleton('tab-calendar'); } }
async function _lazyRenderWorkoutCalendarHome(){ const m = await _lazy('calendar', './render-calendar.js'); m.renderWorkoutCalendarHome?.(); return m; }
import { loadAndInjectModals } from './modal-manager.js';

// ── 분리된 모달 핸들러 import ──────────────────────────────────
import {
  openGoalModal, closeGoalModal, toggleGoalCondition,
  saveGoalFromModal, deleteGoalItem, analyzeGoalFeasibilityHandler
} from './app-modal-goals.js';
import {
  openQuestModal, closeQuestModal, onQuestAutoChange,
  saveQuestFromModal, openQuestEditModal, closeQuestEditModal,
  saveQuestEdit, deleteQuestItem, toggleQuestCheck
} from './app-modal-quests.js';

// ── 모달 및 CSV 초기화 ───────────────────────────────────────────
async function initializeApp() {
  await loadAndInjectModals();
  initWorkoutSystemBack();

  // 전역 data-action 이벤트 위임 라우터 (R0 인프라)
  // 기존 onclick 과 공존. 새 UI는 registerAction 으로 등록 → window.* 점진 제거.
  try { initActionRouter(); } catch (e) { console.warn('[app] action router init 실패:', e); }

  // Phase D/E UX 폴리시 (오프라인 배너 / 포커스 트랩 / aria-label)
  try { initUxPolish(); } catch (e) { console.warn('[app] UX polish init 실패:', e); }

  // CSV 데이터 백그라운드 로드
  const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
  const csvPath = basePath + '/public/data/foods.csv';
  loadCSVDatabase(csvPath)
    .then(() => console.log('[app] CSV 데이터 백그라운드 로드 완료'))
    .catch(e => console.warn('[app] CSV 로드 실패:', e));

}

// ── 모달 유틸리티 ────────────────────────────────────────────────
let _openModalStack = [];

function _openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  _openModalStack.push(id);
  document.body.style.overflow = 'hidden';
}
function _closeModal(id, e) {
  if (e && e.target !== document.getElementById(id)) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  _openModalStack = _openModalStack.filter(x => x !== id);
  if (_openModalStack.length === 0) document.body.style.overflow = '';
}

// ESC키로 최상위 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _openModalStack.length > 0) {
    const topId = _openModalStack[_openModalStack.length - 1];
    _closeModal(topId);
  }
});
// feature 모듈에서 사용할 수 있도록 window에 노출
window._openModal = _openModal;
window._closeModal = _closeModal;

let _lifeZoneNpcQuestEventBound = false;
function _bindLifeZoneNpcQuestEvent() {
  if (_lifeZoneNpcQuestEventBound) return;
  _lifeZoneNpcQuestEventBound = true;
  document.addEventListener('life-zone:npc-quest', async (event) => {
    const npc = event?.detail?.npc;
    const modalByNpc = {
      trainer: {
        opener: 'openTrainerQuestModal',
        label: '트레이너'
      },
      miranda: {
        opener: 'openMirandaQuestModal',
        label: '미란다'
      },
      consultingChief: {
        opener: 'openConsultingChiefQuestModal',
        label: '상담실장'
      }
    };
    const modalConfig = modalByNpc[npc];
    if (!modalConfig) return;
    event.preventDefault?.();
    try {
      await loadAndInjectModals();
      const opener = window[modalConfig.opener];
      if (typeof opener === 'function') {
        opener();
        return;
      }
      throw new Error(`${modalConfig.opener} is not registered`);
    } catch (error) {
      console.warn('[app] life zone NPC modal open failed:', error);
      showToast?.(`${modalConfig.label} 대화창을 열지 못했어요. 새로고침 후 다시 시도해주세요.`, 2500, 'error');
    }
  });
}

let _runningLiveEventBound = false;
function _bindRunningLiveEvent() {
  if (_runningLiveEventBound) return;
  _runningLiveEventBound = true;
  document.addEventListener('life-zone:running-live', () => {
    if (_currentTab === 'home') renderHome();
  });
}

// ── 탭 전환 ──────────────────────────────────────────────────────
let _currentTab = 'home';
window._getCurrentTab = () => _currentTab;

function _syncNavigationForCurrentRole() {
  const adminOnlyMode = isAdmin();
  const tabNav = document.getElementById('tab-nav');
  const topNav = document.querySelector('.top-nav');
  const moreMenu = document.getElementById('more-menu');
  const adminMenu = document.getElementById('admin-menu-items');
  const moreBtn = tabNav?.querySelector('.tab-more-btn');

  ['home', 'diet', 'workout', 'stats', 'calendar'].forEach((tabId) => {
    const btn = tabNav?.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (btn) btn.style.display = adminOnlyMode ? 'none' : '';
  });

  if (moreBtn) {
    moreBtn.style.display = '';
    moreBtn.dataset.mode = adminOnlyMode ? 'admin-only' : 'default';
    moreBtn.dataset.appAction = adminOnlyMode ? 'switch-tab' : 'toggle-more-menu';
    moreBtn.dataset.tab = adminOnlyMode ? 'admin' : 'more';
    moreBtn.innerHTML = adminOnlyMode
      ? '<span class="tab-icon nav-icon nav-icon-admin" aria-hidden="true"></span><span class="tab-label">토마토어드민</span>'
      : '<span class="tab-icon nav-icon nav-icon-more" aria-hidden="true"></span><span class="tab-label">더보기</span>';
    moreBtn.onclick = null;
    moreBtn.classList.toggle('active', _currentTab === 'admin' && adminOnlyMode);
  }

  if (adminMenu) adminMenu.style.display = isAdmin() ? '' : 'none';

  if (tabNav) tabNav.style.display = '';
  if (topNav) topNav.style.display = adminOnlyMode && _currentTab === 'admin' ? 'none' : '';
  if (moreMenu && adminOnlyMode) moreMenu.style.display = 'none';
}

const APP_SHELL_ACTION_SCOPE = '.top-nav, #notif-center, #notif-center-backdrop, #tab-nav, #more-menu, #tab-settings-modal';

function _closeMoreMenu() {
  const menu = document.getElementById('more-menu');
  if (menu) menu.style.display = 'none';
}

function _runWindowAction(actionName, ...args) {
  const fn = window[actionName];
  if (typeof fn === 'function') return fn(...args);
  console.warn(`[app-shell] missing action: ${actionName}`);
  return undefined;
}

function _runAppShellAction(action, control, event) {
  const tab = control?.dataset?.tab;
  switch (action) {
    case 'install-pwa':
      installPWA();
      break;
    case 'open-letter-modal':
      _runWindowAction('openLetterModal');
      break;
    case 'toggle-notif-center':
      _runWindowAction('toggleNotifCenter');
      break;
    case 'logout-account':
      _runWindowAction('logoutAccount');
      break;
    case 'mark-all-notifs-read':
      _runWindowAction('markAllNotifsRead');
      break;
    case 'close-notif-center':
      _runWindowAction('closeNotifCenter');
      break;
    case 'switch-tab':
      if (tab) void switchTab(tab);
      break;
    case 'toggle-more-menu':
      _runWindowAction('toggleMoreMenu');
      break;
    case 'switch-tab-close-more':
      if (tab) void switchTab(tab);
      _closeMoreMenu();
      break;
    case 'open-tab-settings-close-more':
      openTabSettingsModal();
      _closeMoreMenu();
      break;
    case 'close-tab-settings':
      closeTabSettingsModal(event);
      break;
    case 'save-tab-settings':
      void saveTabSettingsFromModal();
      break;
    default:
      console.warn(`[app-shell] unknown action: ${action}`);
  }
}

function _bindAppShellActions(root = document) {
  const marker = root.documentElement || root;
  if (!marker || marker.dataset.appShellActionsBound === '1') return;
  marker.dataset.appShellActionsBound = '1';

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const control = target?.closest?.('[data-app-action]');
    if (!control || !root.contains(control)) return;
    if (!control.matches(APP_SHELL_ACTION_SCOPE) && !control.closest(APP_SHELL_ACTION_SCOPE)) return;
    if (control.id === 'tab-settings-modal' && event.target !== control) return;

    event.preventDefault();
    _runAppShellAction(control.dataset.appAction, control, event);
  });
}

function _dateKeyFromParts(y, m, d) {
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function _parseWorkoutDateKey(key) {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function _takeWorkoutTargetSessionIndex(fallback = 0) {
  const raw = window.__wtTargetSessionIndex;
  if (raw !== undefined && raw !== null) {
    try { delete window.__wtTargetSessionIndex; } catch { window.__wtTargetSessionIndex = null; }
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
  }
  return fallback;
}

const WORKOUT_PULL_BACK_DEADZONE_PX = 8;
const WORKOUT_PULL_BACK_THRESHOLD_PX = 72;
function _setWorkoutSurface() {
  const panel = document.getElementById('tab-workout');
  if (!panel) return;
  panel.classList.add('wt-calendar-home-mode');
}

async function _renderWorkoutCalendarRoute(snapshot = getWorkoutNavSnapshot(), action = '') {
  _setWorkoutSurface();
  const calendarModule = await _lazyRenderWorkoutCalendarHome();
  calendarModule.applyWorkoutCalendarNavSnapshot?.(snapshot, { preserveScroll: true, action });
}

async function _renderWorkoutRoute(snapshot = getWorkoutNavSnapshot(), action = '') {
  await _renderWorkoutCalendarRoute(snapshot, action);
}

async function openWorkoutDaySheetFromAction(key, sessionIndex = 0, options = {}) {
  const dateKey = typeof key === 'string'
    ? key
    : _dateKeyFromParts(key?.y, key?.m, key?.d);
  const parsed = _parseWorkoutDateKey(dateKey);
  if (!parsed) return false;
  const targetSessionIndex = Math.max(0, Math.floor(Number(sessionIndex) || 0));
  const action = options.action || 'sheet:open-external';
  openWorkoutDaySheet(dateKey, {
    sessionIndex: targetSessionIndex,
    sheetState: 'full',
    viewYear: parsed.y,
    viewMonth: parsed.m,
    scrollTop: 0,
    history: options.history || 'replace',
    notify: false,
    action,
  });
  if (_currentTab !== 'workout') {
    await switchTab('workout', { preserveWorkoutRoute: true });
    return true;
  }
  await _renderWorkoutRoute(getWorkoutNavSnapshot(), action);
  return true;
}

subscribeWorkoutNav((snapshot, action) => {
  if (_currentTab !== 'workout') return;
  _renderWorkoutRoute(snapshot, action).catch(e => console.warn('[app] workout route render failed:', e));
});
function _handleWorkoutOverlayBack() {
  return _currentTab === 'workout' && (
    window.wtHandleRunningSessionBack?.() === true ||
    window.wtHandleExercisePickerBack?.() === true
  );
}

function _isWorkoutPullBlockedTarget(target) {
  return !!target?.closest?.('input, textarea, select, [contenteditable="true"], [data-wt-day-sheet], [data-wt-calendar-scroll-surface], .modal-backdrop.open, .modal-overlay.open');
}

function _nearestWorkoutScroller(target) {
  const panel = document.getElementById('tab-workout');
  let node = target instanceof Element ? target : null;
  while (node && node !== panel && node !== document.body && node !== document.documentElement) {
    const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(node) : null;
    const overflowY = style?.overflowY || '';
    if (node.scrollHeight > node.clientHeight + 1 && /(auto|scroll|overlay)/.test(overflowY)) return node;
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function _workoutPageScrollTop() {
  return Math.max(
    0,
    Number(document.scrollingElement?.scrollTop) || 0,
    Number(document.documentElement?.scrollTop) || 0,
    Number(document.body?.scrollTop) || 0,
    Number(window.scrollY) || 0
  );
}

function _canStartWorkoutPullBack(target) {
  if (_currentTab !== 'workout' || _isWorkoutPullBlockedTarget(target)) return false;
  const rootTop = _workoutPageScrollTop();
  const scroller = _nearestWorkoutScroller(target);
  const scrollerTop = Math.max(0, Number(scroller?.scrollTop) || 0);
  return rootTop <= 1 && scrollerTop <= 1;
}

let _workoutPullBackGesture = null;
let _workoutPullBackBound = false;
function initWorkoutPullBackGesture() {
  if (_workoutPullBackBound || typeof window === 'undefined') return;
  _workoutPullBackBound = true;

  const reset = () => { _workoutPullBackGesture = null; };
  const onStart = (event) => {
    if (event.touches?.length !== 1) return reset();
    const touch = event.touches[0];
    _workoutPullBackGesture = {
      startX: touch.clientX,
      startY: touch.clientY,
      handled: false,
      canPull: _canStartWorkoutPullBack(event.target),
    };
  };
  const onMove = (event) => {
    const gesture = _workoutPullBackGesture;
    if (!gesture || event.touches?.length !== 1 || _currentTab !== 'workout') return;
    const touch = event.touches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    if (!gesture.canPull || dy <= WORKOUT_PULL_BACK_DEADZONE_PX || Math.abs(dx) > dy * 0.75) return;

    if (event.cancelable) event.preventDefault();
    if (gesture.handled || dy < WORKOUT_PULL_BACK_THRESHOLD_PX) return;
    gesture.handled = true;
    _handleWorkoutOverlayBack() || handleWorkoutBack({ activeTab: _currentTab, preferHistory: true, action: 'pull:back' });
  };

  window.addEventListener('touchstart', onStart, { passive: true, capture: true });
  window.addEventListener('touchmove', onMove, { passive: false, capture: true });
  window.addEventListener('touchend', reset, { passive: true, capture: true });
  window.addEventListener('touchcancel', reset, { passive: true, capture: true });
}

enableWorkoutPwaHistory({
  getActiveTab: () => _currentTab,
  handleOverlayBack: _handleWorkoutOverlayBack,
});
window.wtOpenWorkoutDaySheet = openWorkoutDaySheetFromAction;
window.wtHandleWorkoutBack = () => _handleWorkoutOverlayBack() || handleWorkoutBack({ activeTab: _currentTab, preferHistory: true });

let _workoutSystemBackBound = false;
function initWorkoutSystemBack() {
  if (_workoutSystemBackBound || typeof window === 'undefined') return;
  const appPlugin = window.Capacitor?.Plugins?.App;
  if (!appPlugin || typeof appPlugin.addListener !== 'function') return;
  _workoutSystemBackBound = true;
  appPlugin.addListener('backButton', (event = {}) => {
    if (_handleWorkoutOverlayBack()) return;
    if (handleWorkoutBack({ activeTab: _currentTab, preferHistory: true })) return;
    if (event.canGoBack && window.history?.back) window.history.back();
  });
}
setTimeout(initWorkoutSystemBack, 0);
setTimeout(initWorkoutPullBackGesture, 0);

async function switchTab(tab, options = {}) {
  if (isAdmin() && tab !== 'admin') tab = 'admin';
  _currentTab = tab;
  document.body?.classList.toggle('wt-workout-tab-active', tab === 'workout');
  trackEvent('nav', 'tab_visit', { tab });
  _syncNavigationForCurrentRole();
  document.querySelectorAll('#tab-nav .tab-btn[data-tab]').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  );
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('active');

  // 코어 탭 (즉시 로드)
  if (tab === 'home')     renderHome();
  if (tab === 'workout') {
    const targetDate = options?.workoutDate || null;
    const hasTargetDate = targetDate
      && Number.isFinite(Number(targetDate.y))
      && Number.isFinite(Number(targetDate.m))
      && Number.isFinite(Number(targetDate.d));
    if (hasTargetDate) {
      const key = _dateKeyFromParts(Number(targetDate.y), Number(targetDate.m), Number(targetDate.d));
      const targetSessionIndex = _takeWorkoutTargetSessionIndex(0);
      const parsed = _parseWorkoutDateKey(key);
      openWorkoutDaySheet(key, {
        sessionIndex: targetSessionIndex,
        sheetState: 'full',
        viewYear: parsed?.y ?? TODAY.getFullYear(),
        viewMonth: parsed?.m ?? TODAY.getMonth(),
        scrollTop: 0,
        action: 'sheet:tab-open',
        history: options?.history || 'replace',
        notify: false,
      });
    } else if (!options?.preserveWorkoutRoute) {
      openWorkoutCalendar({
        action: 'calendar:tab-today',
        history: 'replace',
        notify: false,
        closeSheet: false,
        selectedKey: _dateKeyFromParts(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()),
        selectedSessionIndex: 0,
        viewYear: TODAY.getFullYear(),
        viewMonth: TODAY.getMonth(),
        scrollTop: 0,
      });
    }
    const routeSnapshot = getWorkoutNavSnapshot();
    _setWorkoutSurface();
    if (hasTargetDate) {
      await _renderWorkoutRoute(routeSnapshot, 'sheet:tab-open');
    } else {
      loadWorkoutDate(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
      await _renderWorkoutRoute(routeSnapshot, options?.preserveWorkoutRoute ? 'route:preserve-tab' : 'calendar:tab');
    }
  }
  if (tab === 'diet')     loadWorkoutDate(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

  // 레이지 로드 탭
  if (tab === 'stats')    await _lazyRenderStats();
  if (tab === 'admin')    await _lazyRenderAdmin();
  if (tab === 'cooking')  await _lazyRenderCooking();
  if (tab === 'calendar') await _lazyRenderCalendar();
  if (tab === 'workout') await _lazyRenderWorkoutCalendarHome();
}

async function renderAll() {
  if (_currentTab === 'admin') {
    await _lazyRenderAdmin();
    return;
  }

  renderHome();
  if (_currentTab === 'stats')    await _lazyRenderStats();
  if (_currentTab === 'cooking')  await _lazyRenderCooking();
  if (_currentTab === 'calendar') await _lazyRenderCalendar();
  if (_currentTab === 'workout') {
    await _lazyRenderWorkoutCalendarHome();
  }
}

document.addEventListener('sheet:saved',   renderAll);
document.addEventListener('cooking:saved', renderAll);

// ── 운동탭에서 날짜 지정 진입 ────────────────────────────────────
function openWorkoutTab(y, m, d) {
  const key = _dateKeyFromParts(y, m, d);
  if (key) {
    openWorkoutDaySheetFromAction(key, _takeWorkoutTargetSessionIndex(0), {
      history: 'replace',
      action: 'sheet:open-from-tab-date',
    });
    return;
  }
  switchTab('workout');
}

// ── 탭 드래그/스와이프/가시성은 navigation.js로 분리됨 ──────────
// ── 목표 및 퀨스트 모달 함수는 app-modal-*.js에서 import됨 ───────────────

// ── 다이어트 플랜/체크인은 feature-*.js로 분리됨 ──────
// ── 초기화 ───────────────────────────────────────────────────────
async function init() {
  let bootUser = null;
  try {
    // 로그인 안 되어있으면 모달만 로드하고 대기
    const { getCurrentUser, loadSavedUser } = await import('./data.js');
    const user = loadSavedUser() || getCurrentUser();
    bootUser = user;
    const previousLastLoginAt = user?.lastLoginAt || 0;
    if (!user) {
      await loadAndInjectModals();
      document.getElementById('loading').style.display = 'none';
      return; // 로그인 화면이 표시됨
    }

    // 모달 로드 + 데이터 로드 병렬 실행
    await Promise.all([
      _withTimeout(loadAndInjectModals(), 8000, 'modal load'),
      _withTimeout(loadAll(), 10000, 'data load'),
    ]);
    // localStorage 캐시를 Firebase 최신으로 동기화
    const { refreshCurrentUserFromDB } = await import('./data.js');
    await _withTimeout(refreshCurrentUserFromDB(), 6000, 'user refresh');
    const refreshedUser = getCurrentUser() || user;
    setLifeZoneVisitContext({
      userId: refreshedUser?.id || user?.id || null,
      previousLastLoginAt,
      createdAt: refreshedUser?.createdAt ?? user?.createdAt ?? 0
    });

    // AI 음식 프로파일 빌드 (P1: 메모리 전용, _cache 기반 — 네트워크 없음, 비동기 비차단)
    // P2에서 runAIEstimate 파이프라인에 연결될 예정. 지금은 관측/축적 단계.
    requestAnimationFrame(async () => {
      try {
        const { rebuildFoodProfile } = await import('./data/ai-food-profile.js');
        rebuildFoodProfile();
      } catch (e) { console.warn('[ai-food-profile]', e); }
    });
    applyTabOrder(getTabOrder());

    // 하단 탭 가시성 적용
    // 김태우(Guest)는 게스트 디폴트 강제 적용 (admin 설정 공유 무시)
    let visTabs;
    if (isAdminGuest()) {
      visTabs = DEFAULT_VIS_TABS;
    } else if (isAdmin()) {
      visTabs = getRawVisibleTabs() || ['home','diet','workout','stats'];
    } else {
      visTabs = getRawVisibleTabs() || DEFAULT_VIS_TABS;
    }
    // diet 탭이 기존 설정에 없으면 추가 + 순서 강제 (홈→식단→운동→나머지)
    if (!visTabs.includes('diet')) {
      visTabs.push('diet');
    }
    // 순서 강제: 원하는 순서대로 정렬
    const TAB_ORDER = ['home','diet','workout','stats'];
    visTabs.sort((a, b) => {
      const ai = TAB_ORDER.indexOf(a), bi = TAB_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    applyVisibleTabs(visTabs);
    _syncNavigationForCurrentRole();

    initTabDrag();
    initSwipeNavigation();
    // 편지 버튼 표시 (모든 사용자)
    const letterBtn = document.getElementById('letter-btn');
    if (letterBtn) letterBtn.style.display = '';

    if (isAdmin()) {
      await switchTab('admin');
      await showDietPremiumReportIfNeeded().catch((e) => console.warn('[diet-premium-report]', e));
    } else {
      renderHome({ deferCheerCard: true });
      let priorityPopupShown = false;
      priorityPopupShown = await showDietPremiumReportIfNeeded().catch((e) => {
        console.warn('[diet-premium-report]', e);
        return false;
      });
      if (previousLastLoginAt) {
        if (!priorityPopupShown) {
          const hoursSinceLogin = (Date.now() - previousLastLoginAt) / 3600000;
          priorityPopupShown = await showWelcomeBackPopup(hoursSinceLogin).catch((e) => {
            console.warn('[welcome-back]', e);
            return false;
          });
        }
      }
      if (!priorityPopupShown) {
        priorityPopupShown = showTutorialIfNeeded({ previousLastLoginAt });
      }
      if (!priorityPopupShown) {
        renderHome();
      }
    }

    // 홈 렌더링 후 즉시 로딩 화면 숨기기 (나머지는 백그라운드)
    const loadEl2 = document.getElementById('loading');
    if (loadEl2) { loadEl2.style.display = 'none'; loadEl2.classList.add('hidden'); }

    // 나머지 초기화는 비동기로 (체감 속도 개선)
    const bellBtn = document.getElementById('notif-bell');
    if (bellBtn) bellBtn.style.display = isAdmin() ? 'none' : '';
    requestAnimationFrame(() => {
      if (!isAdmin()) {
        refreshNotifCenter();
        loadWorkoutDate(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
      }
    });

    // FCM 푸시 알림 초기화 (백그라운드)
    initFCM();
  } catch (err) {
    console.error('[init] 초기화 오류:', err);
    // 오류가 발생해도 로딩 화면 숨기고 기본 렌더링
    renderHome();
  } finally {
    const loadEl = document.getElementById('loading');
    if (loadEl) { loadEl.style.display = 'none'; loadEl.classList.add('hidden'); }
    window.__tomatoAppReady = true;
    window.dispatchEvent(new Event('tomato-app-ready'));
    if (bootUser) {
      requestAnimationFrame(() => {
        showDietPremiumReportIfNeeded().catch((e) => console.warn('[diet-premium-report]', e));
      });
      setTimeout(() => {
        document.querySelectorAll('.today-cell')[0]
          ?.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 400);
      // PWA 설치 안내 배너 (앱 미설치 + 이전에 닫지 않았으면)
      showPWAInstallBanner();
      updateInstallBtn();
    }
  }
}

const _MEAL_QUICK_LABELS = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

function closeMealQuickAdd() {
  document.querySelector('[data-meal-quick-add]')?.remove();
}

async function _runMealQuickAction(action, meal) {
  if (!meal) return;
  window._nutritionSearchMeal = meal;
  if (action === 'search') {
    closeMealQuickAdd();
    await window.openNutritionSearch(meal);
    return;
  }
  if (action === 'direct') {
    closeMealQuickAdd();
    await window.openNutritionSearch(meal);
    window.closeNutritionSearch?.();
    if (typeof window.openNutritionDirectAdd === 'function') {
      window.openNutritionDirectAdd();
      return;
    }
    window.openNutritionItemEditor(null);
    return;
  }
  if (action === 'photo-ai') {
    closeMealQuickAdd();
    document.getElementById(`ai-photo-input-${meal}`)?.click();
    return;
  }
  if (action === 'photo-attach') {
    closeMealQuickAdd();
    document.getElementById(`photo-input-${meal}`)?.click();
    return;
  }
  if (action === 'skip') {
    closeMealQuickAdd();
    window.wtSkipMeal(meal);
  }
}

function openMealQuickAdd(meal) {
  if (!meal) {
    console.warn('[diet-input] meal quick-add meal 누락');
    showToast?.('끼니 정보를 찾지 못했어요. 새로고침 후 다시 시도해주세요.', 2500, 'error');
    return;
  }
  const mealLabel = _MEAL_QUICK_LABELS[meal] || '식사';
  closeMealQuickAdd();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="meal-quick-add-backdrop" data-meal-quick-add data-meal="${meal}">
      <div class="meal-quick-add-sheet" role="dialog" aria-modal="true" aria-label="${mealLabel} 음식 추가">
        <div class="meal-quick-add-head">
          <span>${mealLabel}</span>
          <strong>어떻게 기록할까요?</strong>
          <button type="button" class="meal-quick-add-close" data-meal-quick-close aria-label="닫기">×</button>
        </div>
        <div class="meal-quick-add-actions">
          <button type="button" data-meal-quick-action="search">검색해서 추가</button>
          <button type="button" data-meal-quick-action="direct">직접 입력</button>
          <button type="button" data-meal-quick-action="photo-ai">AI 사진 분석</button>
          <button type="button" data-meal-quick-action="photo-attach">사진만 첨부</button>
          ${meal === 'snack' ? '' : '<button type="button" data-meal-quick-action="skip">안 먹었어요</button>'}
        </div>
      </div>
    </div>
  `);
  const sheet = document.querySelector('[data-meal-quick-add]');
  sheet?.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (target === sheet || target?.closest?.('[data-meal-quick-close]')) {
      event.preventDefault();
      closeMealQuickAdd();
      return;
    }
    const actionBtn = target?.closest?.('[data-meal-quick-action]');
    if (!actionBtn) return;
    event.preventDefault();
    try {
      await _runMealQuickAction(actionBtn.getAttribute('data-meal-quick-action'), meal);
    } catch (err) {
      console.error('[diet-input] meal quick-add action failed:', err);
      showToast?.('식단 입력 창을 열지 못했어요. 잠시 후 다시 시도해주세요.', 2500, 'error');
    }
  });
}

window.openMealQuickAdd = openMealQuickAdd;

// ── 식단 입력 버튼 이벤트 위임 (끼니별 버튼 지원) ──────────────────
function _initDietInputButtons() {
  const dietGrid = document.querySelector('.diet-grid');
  if (!dietGrid) return;

  dietGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const action = btn.dataset.action;
    const meal = btn.dataset.meal || btn.closest('[data-meal]')?.dataset.meal; // 끼니 (breakfast/lunch/dinner/snack)

    // meal이 있으면 해당 끼니를 미리 선택
    if (meal) window._nutritionSearchMeal = meal;

    if (action === 'openMealQuickAdd') {
      if (!meal) {
        console.warn('[diet-input] openMealQuickAdd meal 누락');
        showToast?.('끼니 정보를 찾지 못했어요. 새로고침 후 다시 시도해주세요.', 2500, 'error');
        return;
      }
      openMealQuickAdd(meal);
    } else if (action === 'addFood') {
      if (typeof window.openNutritionSearch !== 'function') {
        console.error('[diet-input] openNutritionSearch 미등록');
        showToast?.('음식 추가를 준비하지 못했어요. 새로고침 후 다시 시도해주세요.', 2500, 'error');
        return;
      }
      try {
        openMealQuickAdd(meal);
      } catch (err) {
        console.error('[diet-input] 음식 검색 모달 열기 실패:', err);
        showToast?.('음식 추가 창을 열지 못했어요. 잠시 후 다시 시도해주세요.', 2500, 'error');
      }
    } else if (action === 'photoUpload') {
      openNutritionPhotoUpload();
    }
  }, false);
}


_bindLifeZoneNpcQuestEvent();
_bindRunningLiveEvent();
_bindAppShellActions();
init();
_initDietInputButtons();

// ── window 등록 ──────────────────────────────────────────────────
window.renderAll                = renderAll;
window.renderHome               = renderHome;
window.switchTab                = switchTab;
window.showToast                = showToast;
window.getDietRec               = getDietRec;
window.getWorkoutRec            = getWorkoutRec;
// 운동·식단 탭
window.openWorkoutTab           = openWorkoutTab;
window.openSheet                = openWorkoutTab;
window.changeWorkoutDate        = changeWorkoutDate;
window.goToTodayWorkout         = goToTodayWorkout;
window.saveWorkoutDay           = saveWorkoutDay;
window._wtExports = { loadWorkoutDate };
// 요리 탭 (레이지)
window.openCookingModal         = async (...a) => (await _lazy('cooking', './render-cooking.js')).openCookingModal(...a);
window.closeCookingModal        = async (...a) => (await _lazy('cooking', './render-cooking.js')).closeCookingModal(...a);
window.saveCookingFromModal     = async (...a) => (await _lazy('cooking', './render-cooking.js')).saveCookingFromModal(...a);
window.deleteCookingFromModal   = async (...a) => (await _lazy('cooking', './render-cooking.js')).deleteCookingFromModal(...a);
window.onCookingPhotoInput      = async (...a) => (await _lazy('cooking', './render-cooking.js')).onCookingPhotoInput(...a);
// 목표
window.openGoalModal            = openGoalModal;
window.closeGoalModal           = closeGoalModal;
window.saveGoalFromModal        = saveGoalFromModal;
window.deleteGoalItem           = deleteGoalItem;
window.analyzeGoalFeasibility   = analyzeGoalFeasibilityHandler;
window.toggleGoalCondition      = toggleGoalCondition;
// 퀘스트
window.openQuestModal           = openQuestModal;
window.closeQuestModal          = closeQuestModal;
window.saveQuestFromModal       = saveQuestFromModal;
window.openQuestEditModal       = openQuestEditModal;
window.closeQuestEditModal      = closeQuestEditModal;
window.saveQuestEdit            = saveQuestEdit;
window.deleteQuestItem          = deleteQuestItem;
window.toggleQuestCheck         = toggleQuestCheck;
window.onQuestAutoChange        = onQuestAutoChange;

// ── 앱 초기화 ────────────────────────────────────────────────
window.addEventListener('load', initializeApp);

// 앱이 다시 포커스되면 홈탭 갱신 (이웃 데이터 최신화)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && _currentTab === 'home') {
    renderHome();
  }
  if (!document.hidden && _currentTab === 'workout') {
    wtRecoverTimers();
  }
});
