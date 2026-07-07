// ================================================================
// utils/build-info.js — 배포 버전 확인 + 서비스워커 업데이트 안내
// ================================================================

let _buildInfoCache = null;
let _updateReloadRequested = false;
const APP_SW_SCOPE = '/tomatofarm/';

function _updateBannerState() {
  if (typeof window === 'undefined') {
    return {
      shownKeys: new Set(),
      reloadRequested: false,
      latestRegistration: null,
      latestKey: null,
      panelOpen: false,
      outsideCloseBound: false,
    };
  }
  if (!window.__tomatoUpdateBannerState) {
    window.__tomatoUpdateBannerState = {};
  }
  const state = window.__tomatoUpdateBannerState;
  if (!(state.shownKeys instanceof Set)) state.shownKeys = new Set(state.shownKeys || []);
  if (typeof state.reloadRequested !== 'boolean') state.reloadRequested = false;
  if (!('latestRegistration' in state)) state.latestRegistration = null;
  if (!('latestKey' in state)) state.latestKey = null;
  if (typeof state.panelOpen !== 'boolean') state.panelOpen = false;
  if (typeof state.outsideCloseBound !== 'boolean') state.outsideCloseBound = false;
  return state;
}

function _buildInfoUrl({ bust = true } = {}) {
  const url = new URL('../build-info.json', import.meta.url);
  if (bust) url.searchParams.set('t', Date.now().toString());
  return url;
}

function _fallbackBuildInfo(error = null) {
  return {
    app: 'tomatofarm',
    commit: 'unknown',
    shortCommit: 'unknown',
    branch: 'unknown',
    deployedAt: 'unknown',
    cacheVersion: 'unknown',
    error: error ? String(error?.message || error) : null,
  };
}

function _shortCommit(info) {
  const raw = String(info?.shortCommit || info?.commit || '').trim();
  if (!raw) return 'unknown';
  return raw.length > 12 ? raw.slice(0, 12) : raw;
}

function _formatDateTime(value) {
  if (!value || value === 'local' || value === 'unknown') return value || 'unknown';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function _esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export async function loadBuildInfo({ force = false } = {}) {
  if (_buildInfoCache && !force) return _buildInfoCache;
  try {
    const res = await fetch(_buildInfoUrl({ bust: force }), { cache: 'no-store' });
    if (!res.ok) throw new Error(`build-info HTTP ${res.status}`);
    const info = await res.json();
    _buildInfoCache = {
      ...info,
      shortCommit: info.shortCommit || String(info.commit || '').slice(0, 12),
      loadedAt: new Date().toISOString(),
    };
  } catch (error) {
    _buildInfoCache = _fallbackBuildInfo(error);
  }
  window.__BUILD_INFO = _buildInfoCache;
  return _buildInfoCache;
}

export async function renderBuildInfo({ targetId = 'settings-build-info', force = true } = {}) {
  const target = document.getElementById(targetId);
  if (!target) return null;
  target.innerHTML = '<div class="settings-build-info-loading">버전 확인 중...</div>';
  const info = await loadBuildInfo({ force });
  const commit = _shortCommit(info);
  const cacheVersion = info?.cacheVersion || 'unknown';
  const branch = info?.branch || 'unknown';
  const deployedAt = _formatDateTime(info?.deployedAt);
  const errorLine = info?.error
    ? `<div class="settings-build-info-error">build-info 확인 실패: ${_esc(info.error)}</div>`
    : '';
  target.innerHTML = `
    <div class="settings-build-info-head">
      <span>현재 앱 버전</span>
      <strong>${_esc(commit)}</strong>
    </div>
    <div class="settings-build-info-grid">
      <span>브랜치</span><b>${_esc(branch)}</b>
      <span>캐시</span><b>${_esc(cacheVersion)}</b>
      <span>배포</span><b>${_esc(deployedAt)}</b>
    </div>
    ${errorLine}
    <button type="button" class="settings-build-info-refresh" id="settings-build-info-refresh">다시 확인</button>
  `;
  document.getElementById('settings-build-info-refresh')?.addEventListener('click', () => {
    renderBuildInfo({ targetId, force: true });
  });
  return info;
}

function _setAppUpdatePanelOpen(open) {
  if (typeof document === 'undefined') return;
  const state = _updateBannerState();
  state.panelOpen = !!open;
  const root = document.getElementById('app-update-indicator');
  if (!root) return;
  const toggle = root.querySelector('#app-update-toggle');
  const panel = root.querySelector('#app-update-panel');
  root.dataset.open = state.panelOpen ? 'true' : 'false';
  if (toggle) toggle.setAttribute('aria-expanded', state.panelOpen ? 'true' : 'false');
  if (panel) panel.hidden = !state.panelOpen;
}

function _hasActiveWorkoutDraftForUpdate() {
  try {
    return typeof window.__wtHasActiveDraft === 'function' && window.__wtHasActiveDraft();
  } catch {
    return false;
  }
}

function _activeUpdateCopy() {
  const activeWorkout = _hasActiveWorkoutDraftForUpdate();
  return activeWorkout
    ? {
        title: '운동 기록 저장됨',
        body: '업데이트 후에도 방금 하던 운동을 이어서 끝낼 수 있어요.',
        button: '기록 보존 후 업데이트',
      }
    : {
        title: '새 버전이 준비됐어요',
        body: '최신 버전으로 다시 시작할 수 있어요.',
        button: '새로고침',
      };
}

function _syncAppUpdateCopy(root, { loading = false } = {}) {
  if (!root) return;
  const copy = _activeUpdateCopy();
  const title = root.querySelector('[data-app-update-title]');
  const body = root.querySelector('[data-app-update-body]');
  const reload = root.querySelector('#app-update-reload');
  if (title) title.textContent = copy.title;
  if (body) body.textContent = copy.body;
  if (reload) reload.textContent = loading ? '새로고침 중...' : copy.button;
  root.classList.toggle('has-active-workout-draft', copy.button !== '새로고침');
}

function _ensureAppUpdateIndicator() {
  if (typeof document === 'undefined' || !document.body) return null;
  document.getElementById('app-update-banner')?.remove();

  let root = document.getElementById('app-update-indicator');
  if (!root) {
    root = document.createElement('div');
    root.id = 'app-update-indicator';
    root.className = 'app-update-indicator';
    root.dataset.open = 'false';
    root.innerHTML = `
      <button type="button" class="app-update-icon-btn" id="app-update-toggle" aria-label="새 버전 확인" aria-expanded="false" aria-controls="app-update-panel">
        <span class="app-update-icon" aria-hidden="true">↻</span>
        <span class="app-update-dot" aria-hidden="true"></span>
      </button>
      <div class="app-update-panel" id="app-update-panel" role="dialog" aria-label="앱 업데이트" hidden>
        <div class="app-update-panel-copy">
          <strong data-app-update-title>새 버전이 준비됐어요</strong>
          <span data-app-update-body>최신 버전으로 다시 시작할 수 있어요.</span>
        </div>
        <button type="button" class="app-update-reload" id="app-update-reload">새로고침</button>
      </div>
    `;
    root.addEventListener('click', (event) => {
      const target = event.target;
      const toggle = target?.closest?.('#app-update-toggle');
      const reload = target?.closest?.('#app-update-reload');
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        _syncAppUpdateCopy(root);
        _setAppUpdatePanelOpen(!_updateBannerState().panelOpen);
        return;
      }
      if (reload) {
        event.preventDefault();
        event.stopPropagation();
        _reloadForAppUpdate(_updateBannerState().latestRegistration, reload);
      }
    });
    document.body.appendChild(root);
  }

  const state = _updateBannerState();
  if (!state.outsideCloseBound) {
    document.addEventListener('click', (event) => {
      const current = document.getElementById('app-update-indicator');
      if (!current || current.contains(event.target)) return;
      _setAppUpdatePanelOpen(false);
    });
    state.outsideCloseBound = true;
  }

  const reload = root.querySelector('#app-update-reload');
  if (reload) {
    reload.disabled = !!state.reloadRequested;
  }
  _syncAppUpdateCopy(root, { loading: !!state.reloadRequested });
  _setAppUpdatePanelOpen(state.panelOpen);
  return root;
}

function _waitForWorkerState(worker, targetStates, timeoutMs = 8000) {
  if (!worker || targetStates.includes(worker.state)) return Promise.resolve(worker || null);
  return new Promise((resolve) => {
    let done = false;
    let timer = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      worker.removeEventListener?.('statechange', onStateChange);
      resolve(worker);
    };
    const onStateChange = () => {
      if (targetStates.includes(worker.state)) finish();
    };
    worker.addEventListener?.('statechange', onStateChange);
    timer = setTimeout(finish, timeoutMs);
  });
}

async function _resolveLatestAppSWRegistration(registration = null) {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return registration;
  }

  let latest = registration
    || _updateBannerState().latestRegistration
    || window.__tomatoAppSWRegistration
    || null;

  try {
    if (typeof window.__refreshTomatoAppSWRegistration === 'function') {
      latest = await window.__refreshTomatoAppSWRegistration(latest);
    } else {
      latest = latest || await navigator.serviceWorker.getRegistration(APP_SW_SCOPE);
      if (latest && typeof latest.update === 'function') {
        latest = await latest.update();
      }
    }
  } catch (error) {
    console.warn('[PWA] 최신 업데이트 확인 실패:', error?.message || error);
  }

  if (latest?.installing) {
    await _waitForWorkerState(latest.installing, ['installed', 'activated', 'redundant']);
  }

  return latest || registration;
}

async function _reloadForAppUpdate(registration = null, button = null) {
  const state = _updateBannerState();
  if (_updateReloadRequested || state.reloadRequested) return false;
  try {
    if (typeof window.__wtPersistActiveDraft === 'function') {
      await Promise.resolve(window.__wtPersistActiveDraft());
    }
  } catch (error) {
    console.warn('[PWA] 운동 초안 저장 후 업데이트 실패:', error?.message || error);
  }
  _updateReloadRequested = true;
  state.reloadRequested = true;
  if (button) {
    button.disabled = true;
    button.textContent = '새로고침 중...';
  }

  const targetRegistration = await _resolveLatestAppSWRegistration(registration);
  state.latestRegistration = targetRegistration || state.latestRegistration;

  const waiting = targetRegistration?.waiting;
  if (waiting && typeof navigator !== 'undefined' && navigator.serviceWorker) {
    let reloaded = false;
    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(reloadOnce, 1500);
    return true;
  }

  window.location.reload();
  return true;
}

function _setRefreshControlBusy(control, busy) {
  if (!control || typeof control !== 'object') return;
  if ('disabled' in control) control.disabled = !!busy;
  control.setAttribute?.('aria-busy', busy ? 'true' : 'false');
  control.classList?.toggle?.('is-loading', !!busy);
}

function _toastAppRefresh(message, type = 'info') {
  try {
    window.showToast?.(message, 2200, type);
  } catch {}
}

export async function requestTomatoAppRefresh({ control = null, source = 'manual' } = {}) {
  const button = control || document.getElementById('app-refresh-btn');
  if (button?.disabled) return { started: false, reason: 'busy', source };
  _setRefreshControlBusy(button, true);
  _toastAppRefresh('최신 앱 버전을 확인하고 있어요.', 'info');

  try {
    const registration = await _resolveLatestAppSWRegistration();
    const waiting = registration?.waiting;
    if (waiting) {
      const key = `${registration?.scope || APP_SW_SCOPE}|${waiting.scriptURL || 'sw.js'}`;
      showAppUpdateBanner(registration, { key });
      _toastAppRefresh('새 버전을 적용합니다.', 'info');
    } else {
      _toastAppRefresh('최신 앱을 다시 불러옵니다.', 'info');
    }

    const started = await _reloadForAppUpdate(registration);
    if (!started) _setRefreshControlBusy(button, false);
    return {
      started,
      hasWaitingWorker: !!waiting,
      source,
    };
  } catch (error) {
    console.warn('[PWA] 수동 앱 새로고침 실패:', error?.message || error);
    _toastAppRefresh('업데이트 확인에 실패해 앱을 다시 불러옵니다.', 'warning');
    window.location.reload();
    return { started: true, error, source };
  }
}

export function showAppUpdateBanner(registration = null, { key = null } = {}) {
  const state = _updateBannerState();
  const bannerKey = key || registration?.waiting?.scriptURL || registration?.scope || 'app-update';
  state.latestRegistration = registration || state.latestRegistration;
  state.latestKey = bannerKey;
  state.shownKeys.add(bannerKey);
  _ensureAppUpdateIndicator();
}

export function initBuildInfoSurface() {
  window.__showAppUpdateBanner = showAppUpdateBanner;
  window.__requestTomatoAppRefresh = requestTomatoAppRefresh;
  loadBuildInfo({ force: false }).catch(() => {});
}
