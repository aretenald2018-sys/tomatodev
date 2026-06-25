// ================================================================
// workout/navigation-stack.js — workout tab screen stack + PWA history
// ================================================================

export const WORKOUT_ROUTES = Object.freeze({
  CALENDAR: 'CalendarScreen',
  RECORD: 'WorkoutRecordScreen',
  DETAIL: 'WorkoutDetailScreen',
});

const HISTORY_KEY = '__tomatoWorkoutNav';
const VALID_ROUTES = new Set(Object.values(WORKOUT_ROUTES));
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
    record: {
      dateKey: null,
      sessionIndex: 0,
      scrollTop: 0,
    },
    detail: {
      dateKey: null,
      sessionIndex: 0,
      exerciseKey: null,
      entryIdx: null,
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

function _normalizeRoute(route) {
  const name = VALID_ROUTES.has(route?.name) ? route.name : WORKOUT_ROUTES.CALENDAR;
  const next = { name };
  if (route?.dateKey) next.dateKey = _validDateKey(route.dateKey) || route.dateKey;
  if (route?.sessionIndex != null) next.sessionIndex = _toInt(route.sessionIndex);
  if (route?.exerciseKey != null) next.exerciseKey = String(route.exerciseKey);
  if (route?.entryIdx != null) next.entryIdx = _toInt(route.entryIdx);
  return next;
}

function _normalizeStack(stack) {
  const input = Array.isArray(stack) && stack.length ? stack.map(_normalizeRoute) : [{ name: WORKOUT_ROUTES.CALENDAR }];
  if (input[0].name !== WORKOUT_ROUTES.CALENDAR) input.unshift({ name: WORKOUT_ROUTES.CALENDAR });
  const output = [{ name: WORKOUT_ROUTES.CALENDAR }];
  const record = input.find(route => route.name === WORKOUT_ROUTES.RECORD);
  const detail = input.find(route => route.name === WORKOUT_ROUTES.DETAIL);
  if (record) output.push(record);
  if (detail) {
    if (!record) {
      output.push({
        name: WORKOUT_ROUTES.RECORD,
        dateKey: detail.dateKey || null,
        sessionIndex: _toInt(detail.sessionIndex),
      });
    }
    output.push(detail);
  }
  return output;
}

function _normalizeState(input = {}) {
  const base = _defaultState();
  const calendar = { ...base.calendar, ...(input.calendar || {}) };
  const record = { ...base.record, ...(input.record || {}) };
  const detail = { ...base.detail, ...(input.detail || {}) };

  calendar.viewYear = calendar.viewYear == null ? null : _toInt(calendar.viewYear);
  calendar.viewMonth = calendar.viewMonth == null ? null : _toInt(calendar.viewMonth);
  calendar.selectedKey = _validDateKey(calendar.selectedKey);
  calendar.selectedSessionIndex = _toInt(calendar.selectedSessionIndex);
  calendar.sheetOpen = !!calendar.sheetOpen;
  calendar.sheetState = VALID_SHEET_STATES.has(calendar.sheetState) ? calendar.sheetState : 'bar';
  calendar.scrollTop = _toInt(calendar.scrollTop);
  calendar.activeTab = String(calendar.activeTab || 'summary');

  record.dateKey = _validDateKey(record.dateKey);
  record.sessionIndex = _toInt(record.sessionIndex);
  record.scrollTop = _toInt(record.scrollTop);

  detail.dateKey = _validDateKey(detail.dateKey);
  detail.sessionIndex = _toInt(detail.sessionIndex);
  detail.exerciseKey = detail.exerciseKey == null ? null : String(detail.exerciseKey);
  detail.entryIdx = detail.entryIdx == null ? null : _toInt(detail.entryIdx);

  const stack = _normalizeStack(input.stack);
  return { stack, calendar, record, detail };
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
    if ('selectedSessionIndex' in partial && !('sessionIndex' in partial)) {
      draft.record.sessionIndex = _toInt(partial.selectedSessionIndex);
    }
  }, { action: options.action || 'calendar:update', history: options.history || 'replace', notify: options.notify !== false });
}

export function openWorkoutCalendar(options = {}) {
  return _commit((draft) => {
    draft.stack = [{ name: WORKOUT_ROUTES.CALENDAR }];
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

export function pushWorkoutRecord({ dateKey, sessionIndex = 0, calendarScrollTop = null } = {}, options = {}) {
  return _commit((draft) => {
    const key = _validDateKey(dateKey) || draft.calendar.selectedKey || draft.record.dateKey;
    const index = _toInt(sessionIndex);
    draft.calendar.selectedKey = key;
    draft.calendar.selectedSessionIndex = index;
    draft.calendar.sheetOpen = true;
    draft.calendar.sheetState = VALID_SHEET_STATES.has(draft.calendar.sheetState) ? draft.calendar.sheetState : 'full';
    if (calendarScrollTop != null) draft.calendar.scrollTop = _toInt(calendarScrollTop);
    draft.record.dateKey = key;
    draft.record.sessionIndex = index;
    draft.stack = [
      { name: WORKOUT_ROUTES.CALENDAR },
      { name: WORKOUT_ROUTES.RECORD, dateKey: key, sessionIndex: index },
    ];
  }, { action: options.action || 'record:push', history: options.history || 'push', notify: options.notify !== false });
}

export function pushWorkoutDetail({ dateKey, sessionIndex = 0, exerciseKey = null, entryIdx = null, recordScrollTop = null } = {}, options = {}) {
  return _commit((draft) => {
    const key = _validDateKey(dateKey) || draft.record.dateKey || draft.calendar.selectedKey;
    const index = _toInt(sessionIndex);
    if (recordScrollTop != null) draft.record.scrollTop = _toInt(recordScrollTop);
    draft.record.dateKey = key;
    draft.record.sessionIndex = index;
    draft.detail.dateKey = key;
    draft.detail.sessionIndex = index;
    draft.detail.exerciseKey = exerciseKey == null ? null : String(exerciseKey);
    draft.detail.entryIdx = entryIdx == null ? null : _toInt(entryIdx);
    draft.stack = [
      { name: WORKOUT_ROUTES.CALENDAR },
      { name: WORKOUT_ROUTES.RECORD, dateKey: key, sessionIndex: index },
      { name: WORKOUT_ROUTES.DETAIL, dateKey: key, sessionIndex: index, exerciseKey: draft.detail.exerciseKey, entryIdx: draft.detail.entryIdx },
    ];
  }, { action: options.action || 'detail:push', history: options.history || 'push', notify: options.notify !== false });
}

function _backMutator(draft) {
  const route = draft.stack[draft.stack.length - 1] || { name: WORKOUT_ROUTES.CALENDAR };
  if (route.name === WORKOUT_ROUTES.DETAIL) {
    draft.stack = draft.stack.filter(item => item.name !== WORKOUT_ROUTES.DETAIL);
    draft.detail = _defaultState().detail;
    return true;
  }
  if (route.name === WORKOUT_ROUTES.RECORD) {
    draft.stack = [{ name: WORKOUT_ROUTES.CALENDAR }];
    draft.calendar.sheetOpen = true;
    draft.calendar.sheetState = VALID_SHEET_STATES.has(draft.calendar.sheetState) ? draft.calendar.sheetState : 'full';
    return true;
  }
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
  const canHandle = currentWorkoutRoute().name !== WORKOUT_ROUTES.CALENDAR || _state.calendar.sheetOpen;
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
    if (!payload?.snapshot) return;
    if (typeof options.getActiveTab === 'function' && options.getActiveTab() !== 'workout') return;
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

