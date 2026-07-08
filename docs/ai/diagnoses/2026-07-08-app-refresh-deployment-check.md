# 앱 새로고침/배포 상태 진단

## 요청

- 헤더 새로고침 버튼을 눌렀는데도 화면이 그대로인 상황을 점검한다.
- 이 버튼은 강제 새로고침이어야 하므로 실제 동작 여부를 확인한다.
- 최신 변경이 production Pages에 배포된 것이 맞는지도 확인한다.

## 결론

1. production Pages 배포는 정상이다.
   - `origin/main`과 로컬 `HEAD`는 모두 `b7a6a43ba5749b36fe925058a8b884fa15891385`다.
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ b7a6a43ba5749b36fe925058a8b884fa15891385`가 통과했다.
   - production `build-info.json`과 `sw.js`가 같은 commit/cache version을 반환했다.

2. refresh 버튼의 앱 코드 경로는 production에 배포되어 있다.
   - `index.html`에 `#app-refresh-btn`과 `data-app-action="refresh-app-update"`가 있다.
   - `app.js`의 app shell action bridge가 `refresh-app-update`를 `window.__requestTomatoAppRefresh({ control, source: 'top-nav' })`로 연결한다.
   - `utils/build-info.js`가 `window.__requestTomatoAppRefresh = requestTomatoAppRefresh`를 등록한다.

3. 오버레이가 없는 로그인 상태에서는 실제 좌표 클릭이 refresh handler까지 도달하고 reload가 발생한다.
   - production Chromium QA에서 `seeded-user` 상태, `loginModalVisible=false`일 때 `#app-refresh-btn` 좌표 클릭 결과:
     - `navigated=true`
     - `afterRefreshCalled={"source":"top-nav","controlId":"app-refresh-btn"}`
     - reload 후 `buildCommit=b7a6a43ba5749b36fe925058a8b884fa15891385`

4. 로그인 화면 또는 길드 온보딩 overlay가 떠 있으면 헤더 버튼 좌표 클릭은 막힌다.
   - 비로그인 상태에서 버튼의 실제 좌표 `elementFromPoint`는 `#app-refresh-btn`이 아니라 `#login-screen`이었다.
   - 길드 온보딩 상태에서 `elementFromPoint`는 `#guild-onboarding-overlay`였다.
   - DOM에서 버튼을 직접 click하면 handler는 실행되므로, 이 경우 문제는 refresh 함수가 아니라 overlay가 포인터 이벤트를 가로막는 상태다.

## 검증 로그

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ b7a6a43ba5749b36fe925058a8b884fa15891385`
  - `[deploy-verify] ok b7a6a43ba574 tomatofarm-v20260707z20-refresh-cardio-intensity static=256`
- PASS: production direct fetch
  - `buildCommit=b7a6a43ba5749b36fe925058a8b884fa15891385`
  - `buildCacheVersion=tomatofarm-v20260707z20-refresh-cardio-intensity`
  - `swCacheVersion=tomatofarm-v20260707z20-refresh-cardio-intensity`
  - `indexAppMarker=20260707e-refresh-cardio-intensity`
  - `hasRefreshButton=true`
  - `hasRefreshAction=true`
- PASS: `node --test tests/pwa-update-auto-reload.test.js tests/app-shell-action-bridge.test.js`
  - 10 tests, 10 pass
- PASS: `git diff --check`
- PASS: production Chromium QA
  - 오버레이 없는 로그인 상태의 좌표 클릭에서 `navigated=true`, `afterRefreshCalled` 기록 확인

## 해석

- 현재 production은 이미 최신 배포본이다. 그래서 사용자가 최신 상태에서 새로고침 버튼을 누르면 화면이 “그대로” 보이는 것은 가능하다.
- 다만 로그인 화면이나 길드 온보딩 같은 fullscreen overlay가 떠 있으면 헤더 버튼은 시각적으로 있어도 실제 터치 타깃은 overlay가 된다. 이 상태에서는 버튼이 작동하지 않는 것이 현재 관측된 재현 조건이다.

## 후속 선택지

1. 현재 상태 유지
   - 오버레이가 없는 일반 로그인 상태에서는 production refresh가 작동한다.

2. 후속 fix 계획 작성
   - 로그인/온보딩 overlay가 떠 있어도 헤더 refresh 버튼만은 항상 클릭 가능하게 만들거나, overlay 내부에도 동일한 강제 새로고침 버튼을 제공한다.
   - 이 경우 `feature-login.js`, `style.css`, `tests/app-shell-action-bridge.test.js` 또는 별도 overlay interaction test, `sw.js` cache version bump가 필요하다.
