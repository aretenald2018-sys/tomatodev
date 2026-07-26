import { showToast } from '../ui/toast.js';

const WEAR_APP_REFRESH_TIMEOUT_MS = 1200;

function _toastAppRefresh(message, type = 'info') {
  try {
    showToast(message, 2200, type);
  } catch {}
}

function _wearAppRefreshPayload(source) {
  const info = window.__BUILD_INFO || {};
  return {
    source,
    cacheVersion: info.cacheVersion || 'unknown',
    commit: info.commit || info.shortCommit || 'unknown',
  };
}

function _timeoutWearAppRefresh(promise, timeoutMs = WEAR_APP_REFRESH_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);
    Promise.resolve(promise)
      .then((value) => finish(value || null))
      .catch((error) => finish({ error }));
  });
}

function _wearAppRefreshPlugin() {
  if (typeof window === 'undefined') return null;
  const plugin = window.Capacitor?.Plugins?.TomatoWearAppUpdate;
  return typeof plugin?.requestRefreshOrInstall === 'function' ? plugin : null;
}

export async function requestWearAppRefreshOrInstall({ source = 'manual' } = {}) {
  const plugin = _wearAppRefreshPlugin();
  if (!plugin) return null;

  const result = await _timeoutWearAppRefresh(
    plugin.requestRefreshOrInstall(_wearAppRefreshPayload(source)),
  );
  if (result?.timedOut) return result;
  if (result?.error) {
    console.warn('[WearOS] 갤럭시워치 업데이트 확인 실패:', result.error?.message || result.error);
    return result;
  }

  const installPrompted = Number(result?.installPrompted || 0);
  const refreshSent = Number(result?.refreshSent || 0);
  if (installPrompted > 0) {
    _toastAppRefresh('갤럭시워치 설치 화면을 열었어요.', 'info');
  } else if (refreshSent > 0) {
    _toastAppRefresh('갤럭시워치에도 새로고침 신호를 보냈어요.', 'info');
  }
  return result;
}
