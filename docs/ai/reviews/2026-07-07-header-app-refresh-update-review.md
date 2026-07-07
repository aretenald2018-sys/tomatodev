# 헤더 앱 업데이트 새로고침 버튼 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-07-header-app-refresh-update.md`
- Slice: Header App Refresh Update Slice 1
- 요청: 알림 아이콘 오른쪽에 새로고침 아이콘을 추가하고, 누르면 최신 앱 캐시/배포본을 적용한다. 배포 대기 변경이 있으면 같이 배포한다.

## 리뷰 결과

PASS. 코드 리뷰 기준으로 새 버튼은 기존 app shell action bridge를 사용하고 inline handler를 추가하지 않았다. `utils/build-info.js`의 수동 갱신 함수는 기존 service worker update helper와 update banner 흐름을 재사용하며, waiting worker가 있으면 `SKIP_WAITING` 적용 경로로 들어가고 없으면 최신 앱을 다시 로드한다.

## 확인한 변경

1. `index.html`에 `#notif-bell` 바로 뒤 `#app-refresh-btn`을 추가했다.
2. `app.js`에 `refresh-app-update` action case를 추가했다.
3. `utils/build-info.js`에 `requestTomatoAppRefresh()`와 `window.__requestTomatoAppRefresh` 노출을 추가했다.
4. `styles/components.css`에 refresh icon busy 상태를 추가했다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260707z19-wear-bridge-load-binding`로 bump했다.
6. `tests/app-shell-action-bridge.test.js`와 `tests/pwa-update-auto-reload.test.js`에 header refresh/update marker 검증을 추가했다.

## 검증

1. PASS: `node --check app.js && node --check utils/build-info.js && node --check pwa-register.js && node --check sw.js`.
2. PASS: `node --test tests/app-shell-action-bridge.test.js tests/pwa-update-auto-reload.test.js tests/workout-active-session-recovery.test.js`.
3. PASS: `npm.cmd run verify:assets`.
4. PASS: `node --test tests/*.test.js` - 741 tests, 741 pass.
5. PASS: `git diff --check`.
6. INFO: TypeScript LSP diagnostics는 local LSP 미설치로 실행하지 못했다.

## 남은 운영 확인

운영 Pages 배포 후 다음을 확인한다.

1. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>` PASS.
2. 배포된 `index.html`, `app.js`, `utils/build-info.js`, `sw.js`에서 refresh button/action/update helper/cache marker가 확인된다.
3. 모바일 폭에서 알림 아이콘 오른쪽에 새로고침 아이콘이 보이고, 클릭 시 콘솔 오류 없이 최신 앱 확인/재로드 flow가 실행된다.

## 제한

`review-work`의 병렬 sub-agent 리뷰는 현재 도구 규칙상 사용자가 명시적으로 병렬 에이전트를 요청하지 않은 경우 spawn이 금지되어 실행하지 않았다. 대신 정적 검증, 회귀 테스트, asset 검증, 배포 marker/브라우저 QA로 대체한다.
