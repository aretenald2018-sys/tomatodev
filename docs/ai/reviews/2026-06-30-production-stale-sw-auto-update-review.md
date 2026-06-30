# 운영계 Stale Service Worker 자동 갱신 리뷰

## 리뷰 대상

- `docs/ai/features/2026-06-30-production-stale-sw-auto-update.md`
- `pwa-register.js`
- `index.html`
- `sw.js`
- `tests/pwa-update-auto-reload.test.js`
- cache marker 기대값 변경 테스트들

## Findings

- 없음.

## 확인한 사항

- 자동 reload는 `tomato-app-ready` 이후에만 즉시 시도되어 `window.__wtHasActiveDraft`가 준비될 시간을 둔다.
- active workout draft가 있으면 `_autoApplyAppSWUpdate()`가 false를 반환하고 기존 `__showAppUpdateBanner` 흐름을 유지한다.
- 자동 적용은 앱 SW registration이 있고 기존 controller가 있는 업데이트 상황에서만 동작한다.
- `index.html`, `pwa-register.js`, `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION` bump가 포함됐다.

## 검증

- PASS: `node --check pwa-register.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/pwa-update-auto-reload.test.js tests/workout-active-session-recovery.test.js` — 8 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `git diff --check`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- not verified yet: 배포 URL 및 실제 운영 기기 stale SW 자동 갱신 확인이 남아 있다.

## 결정

- 추가 수정 이슈 없음. Dashboard3와 Tomato Farm 운영계에 배포해 stale SW 교체를 검증한다.
