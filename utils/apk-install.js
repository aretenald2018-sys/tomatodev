import { showToast } from '../ui/toast.js';
import { loadBuildInfo } from './build-info.js';

const TOMATODEV_APK_DOWNLOAD_PATH = '../public/downloads/tomatodev.apk';
const TOMATODEV_APK_DOWNLOAD_NAME = 'tomatodev.apk';
// 게시된 APK가 어느 빌드인지는 APK 자신만 안다. 웹은 배포될 때마다 새로워지지만
// APK는 로컬에서 수동으로 빌드해 커밋할 때만 갱신되므로, 두 시각을 같은 것으로
// 다루면 낡은 바이너리가 최신 배포본인 척하게 된다.
const TOMATODEV_APK_INFO_PATH = '../public/downloads/tomatodev-apk-info.json';
// APK 셸은 www/만 담고 있어 public/ 경로가 존재하지 않는다. 네이티브에서는
// 배포된 절대 URL을 열어야 Capacitor가 외부 브라우저로 넘겨 설치가 시작된다.
const TOMATODEV_APK_REMOTE_URL = 'https://aretenald2018-sys.github.io/tomatodev/public/downloads/tomatodev.apk';
const TOMATODEV_APK_INFO_REMOTE_URL = 'https://aretenald2018-sys.github.io/tomatodev/public/downloads/tomatodev-apk-info.json';

let _apkInfoCache = null;

// 내려받은 파일이 어느 배포본인지 파일명만 보고 알 수 있어야 한다.
// 웹 배포 시각이 아니라 APK가 실제로 빌드된 시각을 로컬 시간대로 붙인다.
export function tomatodevApkFileName(apkInfo = null) {
  const builtAt = String(apkInfo?.builtAt || apkInfo?.deployedAt || '');
  const stamp = Date.parse(builtAt);
  if (!Number.isFinite(stamp)) return TOMATODEV_APK_DOWNLOAD_NAME;
  const at = new Date(stamp);
  const pad = value => String(value).padStart(2, '0');
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}`;
  return `tomatodev-${date}-${time}.apk`;
}

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

function _tomatodevApkInfoUrl() {
  if (_isNativeAppShell()) return TOMATODEV_APK_INFO_REMOTE_URL;
  return new URL(TOMATODEV_APK_INFO_PATH, import.meta.url).href;
}

// 게시된 APK의 신원(빌드 시각, 담고 있는 웹 빌드의 cacheVersion, versionCode)을 읽는다.
// scripts/build-mobile-apk.mjs가 APK를 게시할 때 같이 써 둔다.
export async function loadTomatodevApkInfo({ force = false } = {}) {
  if (_apkInfoCache && !force) return _apkInfoCache;
  try {
    const res = await fetch(_tomatodevApkInfoUrl(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`apk-info HTTP ${res.status}`);
    const info = await res.json();
    if (!info || typeof info !== 'object') throw new Error('apk-info malformed');
    _apkInfoCache = {
      ...info,
      shortCommit: info.shortCommit || String(info.commit || '').slice(0, 12),
    };
  } catch {
    return null;
  }
  return _apkInfoCache;
}

// 게시 경로가 고정이라 브라우저/CDN 캐시가 이전 바이너리를 그대로 돌려줄 수 있다.
// 빌드마다 달라지는 키를 붙여 새 APK를 받도록 한다.
function _apkCacheKey(apkInfo) {
  const commit = String(apkInfo?.shortCommit || apkInfo?.commit || '').trim();
  if (commit && commit !== 'unknown') return commit;
  const stamp = Date.parse(String(apkInfo?.builtAt || ''));
  return Number.isFinite(stamp) ? String(stamp) : '';
}

function _tomatodevApkDownloadUrl(apkInfo = null) {
  const base = _isNativeAppShell()
    ? TOMATODEV_APK_REMOTE_URL
    : new URL(TOMATODEV_APK_DOWNLOAD_PATH, import.meta.url).href;
  const key = _apkCacheKey(apkInfo);
  if (!key) return base;
  const url = new URL(base);
  url.searchParams.set('v', key);
  return url.href;
}

// 게시된 APK가 지금 열려 있는 웹 배포보다 뒤처졌는지 본다. APK는 담고 있는 웹
// 빌드의 cacheVersion을 기록하므로, 그 값이 배포본과 다르면 APK 안의 화면도 다르다.
export function isTomatodevApkBehindDeploy(apkInfo, buildInfo) {
  const apkCache = String(apkInfo?.cacheVersion || '').trim();
  const webCache = String(buildInfo?.cacheVersion || '').trim();
  if (apkCache && webCache && apkCache !== 'unknown' && webCache !== 'unknown') {
    return apkCache !== webCache;
  }
  // cacheVersion을 못 읽으면 빌드 시각으로 판단한다.
  const builtAt = Date.parse(String(apkInfo?.builtAt || ''));
  const deployedAt = Date.parse(String(buildInfo?.deployedAt || ''));
  if (!Number.isFinite(builtAt) || !Number.isFinite(deployedAt)) return false;
  return builtAt < deployedAt;
}

function _shortBuildStamp(isoText) {
  const stamp = Date.parse(String(isoText || ''));
  if (!Number.isFinite(stamp)) return '';
  const at = new Date(stamp);
  const pad = value => String(value).padStart(2, '0');
  return `${pad(at.getMonth() + 1)}/${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

function _startTomatodevApkDownload(downloadName = TOMATODEV_APK_DOWNLOAD_NAME, apkInfo = null) {
  const downloadUrl = _tomatodevApkDownloadUrl(apkInfo);
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
  link.download = downloadName;
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
    // 게시된 APK의 빌드 정보를 파일명과 캐시 무력화 키에 담는다.
    // 실패해도 다운로드 자체는 막지 않는다.
    let downloadName = TOMATODEV_APK_DOWNLOAD_NAME;
    let apkInfo = null;
    let behindDeploy = false;
    try {
      apkInfo = await loadTomatodevApkInfo();
      if (apkInfo) downloadName = tomatodevApkFileName(apkInfo);
      // 지금 배포된 상태와 견줘야 하므로 페이지 로드 때 캐시된 값을 쓰지 않는다.
      behindDeploy = isTomatodevApkBehindDeploy(apkInfo, await loadBuildInfo({ force: true }));
    } catch {}

    const download = _startTomatodevApkDownload(downloadName, apkInfo);
    if (download.started) {
      // 최신 배포판을 담지 않은 APK를 최신인 것처럼 내려주면 안 된다.
      if (behindDeploy) {
        const stamp = _shortBuildStamp(apkInfo?.builtAt);
        _toastAppRefresh(
          stamp
            ? `내려받는 APK는 ${stamp} 빌드본이에요. 최신 배포판보다 이전이라 앱 화면이 다를 수 있어요.`
            : '내려받는 APK가 최신 배포판보다 이전 빌드예요. 앱 화면이 다를 수 있어요.',
          'warning',
        );
      }
      return {
        started: true,
        reason: download.reason || 'browser-download',
        downloadUrl: download.downloadUrl,
        downloadName,
        apkInfo,
        behindDeploy,
        source,
      };
    }
    _toastAppRefresh('APK 다운로드를 시작하지 못했어요. 브라우저에서 다운로드를 허용해주세요.', 'warning');
    return { started: false, reason: download.reason, downloadUrl: download.downloadUrl, apkInfo, behindDeploy, source };
  } finally {
    _setRefreshControlBusy(button, false);
  }
}
