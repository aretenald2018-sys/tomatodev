import { dateKey, getCurrentUser, loadSavedUser } from '../data.js';
import { parseDateKey } from '../utils/date-key.js';
import { wtOpenRunningSession } from '../workout/running-session.js';
import { scheduleSeasonDashboardWidgetSync } from '../workout/season-widget-bridge.js';

let _switchTab = async () => false;
let _renderWorkoutCalendarHome = async () => ({});
let _startTomatoUserSession = async () => false;
let _openWorkoutDaySheetFromAction = async () => false;

export function configureDeepLinkEntry({
  switchTab,
  renderWorkoutCalendarHome,
  startTomatoUserSession,
  openWorkoutDaySheetFromAction,
} = {}) {
  if (typeof switchTab === 'function') _switchTab = switchTab;
  if (typeof renderWorkoutCalendarHome === 'function') _renderWorkoutCalendarHome = renderWorkoutCalendarHome;
  if (typeof startTomatoUserSession === 'function') _startTomatoUserSession = startTomatoUserSession;
  if (typeof openWorkoutDaySheetFromAction === 'function') _openWorkoutDaySheetFromAction = openWorkoutDaySheetFromAction;
}

export async function openDashboardDestination(action) {
  if (action === 'refresh') {
    scheduleSeasonDashboardWidgetSync('manual-refresh', 0);
    return;
  }
  if (action === 'diet') {
    await _switchTab('diet');
    return;
  }
  // 위젯의 식단 칸은 "오늘 얼마나 먹었나"를 보여준다. 눌렀을 때 탭만 열면
  // 사용자가 다시 끼니를 찾아 눌러야 하므로, 지금 시간대의 끼니 입력을 바로 연다.
  if (action === 'diet-input') {
    await _switchTab('diet');
    const [{ openNutritionSearch }, { mealForHour }] = await Promise.all([
      import('../feature-nutrition.js'),
      import('../diet/meal-model.js'),
    ]);
    await openNutritionSearch(mealForHour(new Date().getHours()));
    return;
  }
  if (action === 'season' || action === 'season-overview') {
    await _switchTab('workout');
    const calendarModule = await _renderWorkoutCalendarHome();
    calendarModule.openWorkoutSeasonOverview?.();
    return;
  }
  // 운동 목표 칸도 같은 이유로 목표 조회가 아니라 목표 입력 시트를 연다.
  if (action === 'workout-goal') {
    await _switchTab('workout');
    const calendarModule = await _renderWorkoutCalendarHome();
    if (typeof calendarModule.openWorkoutGoalInput === 'function') {
      calendarModule.openWorkoutGoalInput();
      return;
    }
    calendarModule.openWorkoutSeasonOverview?.();
    return;
  }
  if (action === 'running') {
    await _switchTab('workout');
    wtOpenRunningSession();
    return;
  }
  if (action === 'workout') await _switchTab('workout');
}

function readDashboardEntry() {
  const params = new URLSearchParams(window.location.search);
  const entry = String(params.get('entry') || '');
  return ['diet', 'diet-input', 'season', 'season-overview', 'running', 'workout-goal'].includes(entry) ? entry : '';
}

function clearDashboardEntry() {
  const url = new URL(window.location.href);
  url.searchParams.delete('entry');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

let _pendingDashboardEntry = readDashboardEntry();
export function openPendingDashboardEntry() {
  if (!_pendingDashboardEntry || !(getCurrentUser() || loadSavedUser())) return;
  const entry = _pendingDashboardEntry;
  _pendingDashboardEntry = '';
  clearDashboardEntry();
  void openDashboardDestination(entry);
}

document.addEventListener('widget:action', (event) => {
  void openDashboardDestination(String(event.detail?.action || ''));
});
document.addEventListener('app:start-user-session', (event) => {
  Promise.resolve(_startTomatoUserSession())
    .then((result) => {
      event.detail?.resolve?.(result);
      if (result) openPendingDashboardEntry();
    })
    .catch((error) => {
      console.error('[app] user session start failed:', error);
      event.detail?.resolve?.(false);
    });
});

// ── 운동탭에서 날짜 지정 진입 ────────────────────────────────────
export function openWorkoutTab(y, m, d) {
  const key = dateKey(Number(y), Number(m), Number(d));
  const parsed = parseDateKey(key);
  if (parsed) {
    _openWorkoutDaySheetFromAction(key, 0, {
      history: 'replace',
      action: 'sheet:open-from-tab-date',
    });
    return;
  }
  _switchTab('workout');
}
