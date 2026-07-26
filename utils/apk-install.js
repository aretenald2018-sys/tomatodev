import { showToast } from '../ui/toast.js';

const TOMATODEV_APK_DOWNLOAD_PATH = '../public/downloads/tomatodev.apk';
const TOMATODEV_APK_DOWNLOAD_NAME = 'tomatodev.apk';
// APK 셸은 www/만 담고 있어 public/ 경로가 존재하지 않는다. 네이티브에서는
// 배포된 절대 URL을 열어야 Capacitor가 외부 브라우저로 넘겨 설치가 시작된다.
const TOMATODEV_APK_REMOTE_URL = 'https://aretenald2018-sys.github.io/tomatodev/public/downloads/tomatodev.apk';

function _setRefreshControlBusy(control, busy) {
  if (!control || typeof control !== 'object') return;
  if ('disabled' in control) control.disabled = !!busy;
  control.setAttribute?.('aria-busy', busy ? 'true' : 'false');
  control.classList?.toggle?.('is-loading', !!busy);
}

function _toastAppRefresh(message, type = 'info') {
  try {
    showToast(message, 2200, type);
  } catch {}
}

function _isNativeAppShell() {
  try {
    return window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function _tomatodevApkDownloadUrl() {
  if (_isNativeAppShell()) return TOMATODEV_APK_REMOTE_URL;
  return new URL(TOMATODEV_APK_DOWNLOAD_PATH, import.meta.url).href;
}

function _startTomatodevApkDownload() {
  const downloadUrl = _tomatodevApkDownloadUrl();
  if (typeof document === 'undefined') {
    return { started: false, reason: 'document-unavailable', downloadUrl };
  }

  // WebView는 download 속성을 무시한다. 앱 바깥 호스트로 여는 창은 Capacitor가
  // ACTION_VIEW 인텐트로 넘겨서 안드로이드 다운로드 매니저가 처리한다.
  if (_isNativeAppShell()) {
    const opened = window.open(downloadUrl, '_blank');
    if (opened === null && typeof window.location?.assign === 'function') {
      window.location.assign(downloadUrl);
    }
    return { started: true, reason: 'native-browser-handoff', downloadUrl };
  }

  const link = document.createElement('a');
  if (!link || typeof link.click !== 'function') {
    return { started: false, reason: 'download-link-unavailable', downloadUrl };
  }

  link.href = downloadUrl;
  link.download = TOMATODEV_APK_DOWNLOAD_NAME;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body?.appendChild?.(link);
  link.click();
  link.remove?.();
  return { started: true, downloadUrl };
}

// TomatoDev는 자신의 개발 APK(com.lifestreak.dev)만 배포한다. 운영 APK는
// 이 저장소에서 노출하지도 내려받지도 않는다.
export async function requestTomatoApkInstall({ control = null, source = 'manual' } = {}) {
  const button = control || (typeof document !== 'undefined' ? document.getElementById('app-refresh-btn') : null);
  if (button?.disabled) return { started: false, reason: 'busy', source };
  _setRefreshControlBusy(button, true);

  try {
    const download = _startTomatodevApkDownload();
    if (download.started) {
      return { started: true, reason: download.reason || 'browser-download', downloadUrl: download.downloadUrl, source };
    }
    _toastAppRefresh('APK 다운로드를 시작하지 못했어요. 브라우저에서 다운로드를 허용해주세요.', 'warning');
    return { started: false, reason: download.reason, downloadUrl: download.downloadUrl, source };
  } finally {
    _setRefreshControlBusy(button, false);
  }
}
