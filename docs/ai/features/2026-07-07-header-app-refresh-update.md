# 헤더 앱 업데이트 새로고침 버튼

## 요청

알림 아이콘 오른쪽에 새로고침 아이콘을 추가하고, 누르면 최신 `CACHE_VERSION`/배포본이 적용되도록 앱 업데이트를 실행한다. 최근 코드 수정이 반영되지 않은 것처럼 보이면 배포 누락 여부도 함께 확인하고 배포한다.

## 진단 요약 (`/diagnose`)

1. `pwa-register.js`에는 앱 Service Worker 업데이트 확인과 `SKIP_WAITING` 적용 경로가 이미 있다.
2. 기존 `utils/build-info.js`는 pending update가 있을 때만 fixed `#app-update-indicator`를 동적으로 만든다.
3. 현재 `index.html` 상단 네비게이션에는 `#notif-bell` 오른쪽에 계정 전환 버튼만 있고, 사용자가 직접 최신 배포본을 확인/적용할 수 있는 항상 보이는 버튼은 없다.
4. 워크트리에는 `sw.js` `CACHE_VERSION = 'tomatofarm-v20260707z17-rest-counter'`까지 올라간 다수의 미커밋 변경이 있어, 운영 Pages가 이 변경을 아직 받지 못했을 가능성이 높다.

## 가설

1. 수동 앱 업데이트 버튼이 없어 사용자가 오래 열린 PWA 세션에서 새 `CACHE_VERSION`을 직접 적용하지 못한다.
   - 증거: `index.html` 헤더 버튼 목록에 `data-app-action="refresh-app-update"` 같은 액션이 없다.
   - 수정: 헤더 버튼 + app shell action + 수동 update/apply 함수 추가.
2. 최근 기능 변경이 배포되지 않아 운영 URL이 이전 커밋/캐시 버전을 제공한다.
   - 증거: 현재 dirty worktree가 많고 `NEXT_ACTION.md`도 production deploy not verified 항목을 남긴다.
   - 수정: 검증 후 `origin/main` 배포와 `verify:deploy` 수행.
3. 기존 fixed update indicator는 요청 위치와 다르며 pending update가 감지될 때만 나타난다.
   - 증거: `utils/build-info.js`가 `document.body`에 fixed indicator를 만든다.
   - 수정: 새 수동 버튼은 top-nav에 두고 기존 pending indicator는 fallback 안내로 유지한다.

## 그릴 결과

- 핵심 질문: 새로고침 버튼은 업데이트가 있을 때만 보일지, 항상 보일지?
- 결정: 사용자가 "코드 수정이 반영 안 된 상태처럼 보임"이라고 했으므로 항상 보이는 수동 새로고침/업데이트 버튼으로 둔다.
- 핵심 질문: 버튼 클릭 시 안내 패널만 열지, 바로 업데이트/새로고침할지?
- 결정: 클릭 즉시 최신 Service Worker 확인 후 waiting worker가 있으면 적용하고, 없으면 현재 문서를 네트워크 우선 reload한다. 저장 중 운동 draft는 기존 `__wtPersistActiveDraft` 경로를 재사용한다.
- 남은 가정: 인증된 실제 앱 데이터 flow는 자동화에서 계정이 없으면 제한될 수 있다. 이 경우 운영 URL 로드/헤더/배포 자산 marker를 우선 증거로 남기고 `not verified yet` 범위를 명시한다.

## 실행 Slice 1

### 구현 범위

1. `index.html` `#notif-bell` 바로 오른쪽에 `id="app-refresh-btn"` 버튼을 추가한다.
2. 버튼은 inline handler 없이 `data-app-action="refresh-app-update"`를 사용한다.
3. `app.js` app shell action bridge에 `refresh-app-update` case를 추가한다.
4. `utils/build-info.js`에 수동 refresh/apply 함수를 추가하고 `window.__requestTomatoAppRefresh`로 노출한다.
5. 클릭 시 `registration.update()`/기존 `__refreshTomatoAppSWRegistration` 경로를 사용해 최신 SW를 확인하고, waiting worker가 있으면 기존 update reload 경로로 적용한다. waiting worker가 없으면 현재 페이지를 reload한다.
6. `index.html`, `app.js`, `utils/build-info.js`, `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump하고 관련 cache marker 테스트를 갱신한다.

### 하지 않을 것

1. 로그인/계정 구조를 변경하지 않는다.
2. Firebase/Firestore 데이터 경로를 변경하지 않는다.
3. `www/`를 직접 수정하지 않는다.
4. 기존 pending update indicator를 제거하지 않는다. 자동 감지 fallback UI로 유지한다.

## 검증 계획

1. RED/GREEN: `tests/app-shell-action-bridge.test.js`에 새 top-nav action/bridge assertion을 추가한다.
2. RED/GREEN: `tests/pwa-update-auto-reload.test.js` 또는 focused source assertion으로 수동 refresh function 노출과 cache marker를 확인한다.
3. 정적 검증: `node --check app.js utils/build-info.js pwa-register.js sw.js`.
4. 회귀 검증: `node --test tests/app-shell-action-bridge.test.js tests/pwa-update-auto-reload.test.js tests/workout-active-session-recovery.test.js`.
5. 자산 검증: `npm.cmd run verify:assets`.
6. 운영 배포 검증: `npm.cmd run deploy:production`, 이후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`.
7. 운영 URL 확인: `https://aretenald2018-sys.github.io/tomatofarm/`에서 `index.html`, `app.js`, `utils/build-info.js`, `sw.js` marker와 헤더 버튼 존재를 확인한다.

## 다음 실행 지시

이 계획의 Slice 1만 구현한다. 헤더 수동 앱 업데이트 버튼, app shell action, `utils/build-info.js` 수동 update/apply 함수, cache/query marker 갱신, 검증과 운영 배포까지 수행한다.

## 실행 결과

1. `index.html`에 `#notif-bell` 바로 뒤 `#app-refresh-btn`을 추가했다.
2. `app.js` app shell action bridge에 `refresh-app-update` case를 추가했다.
3. `utils/build-info.js`에 `requestTomatoAppRefresh()`를 추가하고 `window.__requestTomatoAppRefresh`로 노출했다.
4. `styles/components.css`에 refresh 버튼 busy spin 상태를 추가했다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260707z19-wear-bridge-load-binding`로 bump했다.
6. `tests/app-shell-action-bridge.test.js`와 `tests/pwa-update-auto-reload.test.js`에 refresh marker 검증을 추가했다.
7. production QA 중 발견한 `workout/index.js` top-level `loadWorkoutDate is not defined` 회귀를 local import로 수정하고 `app.js -> render-workout.js -> workout/index.js` query marker를 `20260707d-wear-bridge-load-binding`로 갱신했다.

## 로컬 검증 결과

1. PASS: `node --check app.js && node --check utils/build-info.js && node --check pwa-register.js && node --check sw.js`.
2. PASS: `node --test tests/app-shell-action-bridge.test.js tests/pwa-update-auto-reload.test.js tests/workout-active-session-recovery.test.js`.
3. PASS: `npm.cmd run verify:assets`.
4. PASS: `node --test tests/*.test.js` - 741 tests, 741 pass.
5. PASS: `git diff --check`.
6. INFO: TypeScript LSP diagnostics는 local LSP 미설치로 실행하지 못했다.
7. PASS: `npm.cmd run deploy:production` - production Pages `verify:deploy` 통과.
8. PASS: deployed marker 검증 - refresh button/action/helper/query/cache marker 확인.
9. PASS: production Puppeteer QA - 모바일 헤더 배치와 새로고침 버튼 click reload flow 확인, pageerror 없음.
