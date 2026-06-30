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
- 완료: 커밋 `4c5ab9f fix: auto apply app service worker updates`를 `origin/main`에 push했다.
- not verified yet: Dashboard3 Pages workflow는 `deploy-pages` 단계에서 실패해 Dashboard3 URL은 이전 커밋을 반환한다.
- 완료: 운영계 `tomatofarm/main`에 커밋 `4c5ab9f`를 push했다.
- PASS: Tomato Farm 운영계 workflow success — run `28438825034`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 4c5ab9f` — `[deploy-verify] ok 4c5ab9f099af tomatofarm-v20260630z14-sw-auto-update static=233`
- PASS: 운영 marker 검증 — `sw.js` cache version, `index.html` pwa registrar query, `pwa-register.js` auto update markers, 기존 drag fix markers
- not verified yet: 실제 운영 기기 stale SW 자동 갱신 확인이 남아 있다.

## 결정

- 추가 수정 이슈 없음. Tomato Farm 운영계 배포는 완료했고, Dashboard3 Pages는 GitHub `deploy-pages` 단계 실패가 남아 있다.
