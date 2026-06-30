# 운영계 Stale Service Worker 자동 갱신 계획

## 요청

개발계에서는 운동 캘린더 드래그 수정이 동작하지만 운영계에서는 동일 증상이 반복된다.

## `/diagnose`

### 증상

- Dashboard3/운영계 배포 asset marker에는 `render-calendar.js::scrollSurfaceAttr`, `style.css::touch-action: pan-y`가 포함되어 있다.
- 사용자는 운영계에서 여전히 바텀시트 영역에서 움직여야 캘린더가 드래그되는 동일 증상을 보고했다.

### 재현/피드백 루프

- 운영 URL direct asset marker 검증은 통과했으므로, 원격 파일 누락보다 기기 내 stale service worker/controller/cache를 우선 확인한다.
- `pwa-register.js`, `sw.js`, `utils/build-info.js`의 update/skipWaiting/reload 경로를 소스 검증한다.
- 회귀 테스트로 새 SW 발견 시 자동 `SKIP_WAITING` + `controllerchange` reload 경로와 운동 중 draft guard를 확인한다.

### 원인 가설

1. 우선순위 높음: 운영 기기에서 기존 Service Worker controller가 열린 탭을 계속 제어해 구 `render-calendar.js`/`style.css`가 남아 있다.
2. 우선순위 높음: 현재 update 흐름은 새 SW를 발견해도 사용자 업데이트 버튼을 보여주는 방식이라, 사용자가 누르지 않으면 구 코드가 유지된다.
3. 우선순위 중간: `index.html`의 `pwa-register.js?v=20260624c` 쿼리가 오래되어 브라우저/중간 캐시가 새 등록 스크립트 로드를 늦출 수 있다.
4. 우선순위 낮음: 운영 URL 자체가 이전 커밋을 서빙한다. `verify:deploy`와 deployed marker 검증상 가능성은 낮다.

## 결정

- 새 앱 SW가 설치/대기 상태가 되면 운동 중 active draft가 없을 때 자동으로 `SKIP_WAITING`을 보내고 `controllerchange`에서 1회 reload한다.
- 운동 중 active draft가 있으면 자동 reload하지 않고 기존 업데이트 버튼을 유지한다.
- `index.html`의 `pwa-register.js` 쿼리를 새 버전으로 올려 운영 기기에서 등록 스크립트 갱신을 더 확실하게 한다.

## 실행 범위

- `pwa-register.js`: 자동 SW apply/reload helper와 active draft guard 추가.
- `index.html`: `pwa-register.js` cache-busting query 갱신.
- `sw.js`: `CACHE_VERSION` bump.
- `tests/*`: 새 update 계약과 cache marker 기대값 갱신.
- `docs/ai/NEXT_ACTION.md`, 리뷰 문서 갱신.

## 하지 않을 것

- 운동 캘린더 drag UI 자체를 다시 변경하지 않는다.
- `render-calendar.js`/`style.css`의 surface fix는 유지한다.
- `www/` 산출물은 직접 수정하지 않는다.

## 검증 계획

- `node --check pwa-register.js`
- `node --check sw.js`
- `node --test tests/pwa-update-auto-reload.test.js tests/workout-active-session-recovery.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test --test-reporter=dot tests/*.test.js`
- `git diff --check`
- `git push origin HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
- `git push tomatofarm HEAD:main`
- `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
- 운영 marker 확인:
  - `pwa-register.js::SKIP_WAITING`
  - `pwa-register.js::controllerchange`
  - `index.html::pwa-register.js?v=20260630z14-sw-auto-update`
  - `sw.js::tomatofarm-v20260630z14-sw-auto-update`

## 다음 실행 프롬프트

`docs/ai/features/2026-06-30-production-stale-sw-auto-update.md` Slice 1을 실행한다.

## 실행 결과

- `pwa-register.js`에 `_autoApplyAppSWUpdate()`를 추가했다.
- 새 앱 Service Worker가 설치/대기 상태가 되면 `tomato-app-ready` 이후 active workout draft를 확인하고, draft가 없을 때 `SKIP_WAITING` + `controllerchange` 1회 reload를 실행한다.
- active workout draft가 있으면 자동 reload하지 않고 기존 업데이트 안내 버튼 흐름으로 남긴다.
- `index.html`의 `pwa-register.js` query를 `20260630z14-sw-auto-update`로 갱신했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260630z14-sw-auto-update`로 bump하고 cache marker 테스트 기대값을 갱신했다.
- `tests/pwa-update-auto-reload.test.js`를 추가했다.

검증:

- PASS: `node --check pwa-register.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/pwa-update-auto-reload.test.js tests/workout-active-session-recovery.test.js` — 8 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `git diff --check`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- not verified yet: Dashboard3/운영계 배포와 실제 운영 기기 stale SW 자동 갱신 확인이 남아 있다.
