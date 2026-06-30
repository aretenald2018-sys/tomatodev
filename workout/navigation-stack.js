// ================================================================
// workout/navigation-stack.js — workout tab screen stack + PWA history
// ================================================================

export const WORKOUT_ROUTES = Object.freeze({
  CALENDAR: 'CalendarScreen',
});

const HISTORY_KEY = '__tomatoWorkoutNav';
const VALID_SHEET_STATES = new Set(['bar', 'full']);

const _listeners = new Set();

let _state = _defaultState();
let _historyEnabled = false;
let _historyDepth = 0;
let _suppressHistoryWrite = false;
let _lastHistoryAction = 'init';

function _defaultState() {
  return {
    stack: [{ name: WORKOUT_ROUTES.CALENDAR }],
    calendar: {
      viewYear: null,
      viewMonth: null,
      selectedKey: null,
      selectedSessionIndex: 0,
      sheetOpen: false,
      sheetState: 'bar',
      scrollTop: 0,
      activeTab: 'summary',
    },
  };
}

function _clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function _toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function _validDateKey(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function _normalizeStack() {
  return [{ name: WORKOUT_ROUTES.CALENDAR }];
}

function _normalizeState(input = {}) {
  const base = _defaultState();
  const calendar = { ...base.calendar, ...(input.calendar || {}) };

  calendar.viewYear = calendar.viewYear == null ? null : _toInt(calendar.viewYear);
  calendar.viewMonth = calendar.viewMonth == null ? null : _toInt(calendar.viewMonth);
  calendar.selectedKey = _validDateKey(calendar.selectedKey);
  calendar.selectedSessionIndex = _toInt(calendar.selectedSessionIndex);
  calendar.sheetOpen = !!calendar.sheetOpen;
  calendar.sheetState = VALID_SHEET_STATES.has(calendar.sheetState) ? calendar.sheetState : 'bar';
  calendar.scrollTop = _toInt(calendar.scrollTop);
  calendar.activeTab = String(calendar.activeTab || 'summary');

  const stack = _normalizeStack(input.stack);
  return { stack, calendar };
}

function _notify(action) {
  const snapshot = getWorkoutNavSnapshot();
  _listeners.forEach((listener) => {
    try { listener(snapshot, action); }
    catch (e) { console.warn('[workout-nav] listener failed:', e); }
  });
}

function _writeHistory(mode, action) {
  if (!_historyEnabled || _suppressHistoryWrite || typeof window === 'undefined' || !window.history) return;
  const payload = {
    ...(window.history.state || {}),
    [HISTORY_KEY]: {
      depth: _historyDepth,
      action,
      snapshot: getWorkoutNavSnapshot(),
    },
  };
  try {
    if (mode === 'push') {
      _historyDepth += 1;
      payload[HISTORY_KEY].depth = _historyDepth;
      window.history.pushState(payload, '', window.location?.href || '');
    } else if (mode === 'replace') {
      payload[HISTORY_KEY].depth = _historyDepth;
      window.history.replaceState(payload, '', window.location?.href || '');
    }
  } catch (e) {
    console.warn('[workout-nav] history write failed:', e);
  }
}

function _commit(mutator, { action = 'update', history = 'replace', notify = true } = {}) {
  const draft = getWorkoutNavSnapshot();
  mutator(draft);
  _state = _normalizeState(draft);
  _lastHistoryAction = action;
  _writeHistory(history, action);
  if (notify) _notify(action);
  return getWorkoutNavSnapshot();
}

export function resetWorkoutNavState(seed = {}) {
  _state = _normalizeState({ ..._defaultState(), ...seed });
  _historyDepth = 0;
  _lastHistoryAction = 'reset';
  _writeHistory('replace', 'reset');
  _notify('reset');
  return getWorkoutNavSnapshot();
}

export function getWorkoutNavSnapshot() {
  return _clone(_state);
}

export function setWorkoutNavSnapshot(snapshot, { action = 'restore', history = 'replace', notify = true } = {}) {
  _state = _normalizeState(snapshot || {});
  _lastHistoryAction = action;
  _writeHistory(history, action);
  if (notify) _notify(action);
  return getWorkoutNavSnapshot();
}

export function subscribeWorkoutNav(listener) {
  if (typeof listener !== 'function') return () => {};
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function currentWorkoutRoute() {
  const stack = _state.stack;
  return _clone(stack[stack.length - 1] || { name: WORKOUT_ROUTES.CALENDAR });
}

export function updateWorkoutCalendarState(partial = {}, options = {}) {
  return _commit((draft) => {
    draft.calendar = { ...draft.calendar, ...partial };
  }, { action: options.action || 'calendar:update', history: options.history || 'replace', notify: options.notify !== false });
}

export function openWorkoutCalendar(options = {}) {
  return _commit((draft) => {
    draft.stack = [{ name: WORKOUT_ROUTES.CALENDAR }];
    if (options.selectedKey != null) draft.calendar.selectedKey = _validDateKey(options.selectedKey) || draft.calendar.selectedKey;
    if (options.selectedSessionIndex != null) draft.calendar.selectedSessionIndex = _toInt(options.selectedSessionIndex);
    if (options.viewYear != null) draft.calendar.viewYear = _toInt(options.viewYear);
    if (options.viewMonth != null) draft.calendar.viewMonth = _toInt(options.viewMonth);
    if (options.scrollTop != null) draft.calendar.scrollTop = _toInt(options.scrollTop);
    if (options.closeSheet) {
      draft.calendar.sheetOpen = false;
      draft.calendar.sheetState = 'bar';
    }
  }, { action: options.action || 'calendar:open', history: options.history || 'replace', notify: options.notify !== false });
}

export function openWorkoutDaySheet(dateKey, options = {}) {
  return _commit((draft) => {
    draft.stack = [{ name: WORKOUT_ROUTES.CALENDAR }];
    draft.calendar.selectedKey = _validDateKey(dateKey) || draft.calendar.selectedKey;
    draft.calendar.selectedSessionIndex = _toInt(options.sessionIndex ?? draft.calendar.selectedSessionIndex);
    draft.calendar.sheetOpen = true;
    draft.calendar.sheetState = VALID_SHEET_STATES.has(options.sheetState) ? options.sheetState : 'full';
    if (options.viewYear != null) draft.calendar.viewYear = _toInt(options.viewYear);
    if (options.viewMonth != null) draft.calendar.viewMonth = _toInt(options.viewMonth);
    if (options.scrollTop != null) draft.calendar.scrollTop = _toInt(options.scrollTop);
  }, { action: options.action || 'sheet:open', history: options.history || 'push', notify: options.notify !== false });
}

export function closeWorkoutDaySheet(options = {}) {
  return _commit((draft) => {
    draft.stack = [{ name: WORKOUT_ROUTES.CALENDAR }];
    draft.calendar.sheetOpen = false;
    draft.calendar.sheetState = 'bar';
  }, { action: options.action || 'sheet:close', history: options.history || 'replace', notify: options.notify !== false });
}

function _backMutator(draft) {
  draft.stack = [{ name: WORKOUT_ROUTES.CALENDAR }];
  if (draft.calendar.sheetOpen) {
    draft.calendar.sheetOpen = false;
    draft.calendar.sheetState = 'bar';
    return true;
  }
  return false;
}

export function popWorkoutRoute(options = {}) {
  let handled = false;
  const snapshot = _commit((draft) => {
    handled = _backMutator(draft);
  }, { action: options.action || 'route:pop', history: options.history || 'replace', notify: options.notify !== false });
  return { handled, snapshot };
}

export function handleWorkoutBack(options = {}) {
  const activeTab = options.activeTab ?? 'workout';
  if (activeTab !== 'workout') return false;
  const canHandle = _state.calendar.sheetOpen;
  if (!canHandle) return false;

  if (options.preferHistory !== false && _historyEnabled && _historyDepth > 0 && typeof window !== 'undefined' && window.history?.back) {
    try {
      window.history.back();
      return true;
    } catch (e) {
      console.warn('[workout-nav] history back failed:', e);
    }
  }

  const result = popWorkoutRoute({ action: options.action || 'back', history: options.history || 'replace' });
  return !!result.handled;
}

export function enableWorkoutPwaHistory(options = {}) {
  if (typeof window === 'undefined' || !window.history) return false;
  if (_historyEnabled) return true;
  _historyEnabled = true;

  const replaceCurrent = () => _writeHistory('replace', 'history:init');
  replaceCurrent();

  window.addEventListener('popstate', (event) => {
    const payload = event.state?.[HISTORY_KEY];
    if (typeof options.getActiveTab === 'function' && options.getActiveTab() !== 'workout') return;
    if (typeof options.handleOverlayBack === 'function' && options.handleOverlayBack()) {
      _historyDepth = _toInt(payload?.depth ?? Math.max(0, _historyDepth - 1));
      _writeHistory('push', 'overlay:back');
      return;
    }
    if (!payload?.snapshot) return;
    _historyDepth = _toInt(payload.depth);
    _suppressHistoryWrite = true;
    try {
      setWorkoutNavSnapshot(payload.snapshot, {
        action: payload.action || 'history:pop',
        history: 'none',
        notify: true,
      });
    } finally {
      _suppressHistoryWrite = false;
    }
  });
  return true;
}

export function getWorkoutHistoryState() {
  return {
    enabled: _historyEnabled,
    depth: _historyDepth,
    lastAction: _lastHistoryAction,
  };
}
