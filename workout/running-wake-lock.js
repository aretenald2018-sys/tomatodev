// ================================================================
// workout/running-wake-lock.js — 러닝 기록 중 화면 잠금 방지
// ================================================================
// 웹/PWA에서는 화면이 꺼지면 문서가 백그라운드로 내려가 geolocation
// 콜백과 타이머가 멈추고, 그동안의 러닝 경로가 통째로 비어버린다.
// Screen Wake Lock으로 활성 구간 동안 자동 화면 꺼짐을 막는다.
//
// 한계: 사용자가 전원 버튼으로 직접 화면을 끄면 웹에서는 막을 수 없다.
// 그 경우의 연속 기록은 네이티브 포그라운드 서비스
// (TomatoRunningLocationPlugin)를 쓰는 APK 경로가 담당한다.

let _sentinel = null;
let _wanted = false;

function _wakeLockApi() {
  if (typeof navigator === 'undefined') return null;
  const api = navigator.wakeLock;
  return typeof api?.request === 'function' ? api : null;
}

function _documentVisible() {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

function _forgetSentinel() {
  _sentinel = null;
}

// 활성 러닝 구간에 진입할 때 호출한다. 미지원 브라우저에서는 조용히 무시된다.
export async function acquireRunningWakeLock() {
  _wanted = true;
  const api = _wakeLockApi();
  if (!api || _sentinel || !_documentVisible()) return false;
  try {
    const sentinel = await api.request('screen');
    // 탭이 숨겨지는 순간 브라우저가 자동 해제하므로 참조를 비워 재획득을 허용한다.
    sentinel?.addEventListener?.('release', _forgetSentinel, { once: true });
    _sentinel = sentinel;
    return true;
  } catch {
    _sentinel = null;
    return false;
  }
}

// 일시정지·종료·이탈 시 호출한다.
export async function releaseRunningWakeLock() {
  _wanted = false;
  const sentinel = _sentinel;
  _sentinel = null;
  if (!sentinel) return false;
  try {
    await sentinel.release?.();
    return true;
  } catch {
    return false;
  }
}

// 화면 복귀 시 재획득한다. 브라우저가 백그라운드 전환에서 잠금을 해제하기 때문이다.
export async function refreshRunningWakeLock() {
  if (!_wanted || _sentinel) return false;
  return acquireRunningWakeLock();
}

export function isRunningWakeLockHeld() {
  return !!_sentinel;
}

export function isRunningWakeLockWanted() {
  return _wanted;
}
