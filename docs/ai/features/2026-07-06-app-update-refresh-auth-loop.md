# 앱 업데이트 새로고침 인증 루프 안정화

## 요청

앱 업데이트 또는 새로고침 때 로그아웃/로그인이 여러 번 반복되는 것처럼 보이는 무한 로딩성 현상이 생기지 않게 한다.

## 진단 요약 (`/diagnose`)

1. 운영 앱은 `index.html`에서 `feature-login.js`가 로그인 화면/저장 유저 복원을 담당하고, `app.js`가 데이터 로드와 최종 앱 준비 이벤트(`tomato-app-ready`)를 담당한다.
2. `pwa-register.js`는 새 Service Worker가 감지되면 `SKIP_WAITING`을 보내고 `controllerchange`에서 reload한다.
3. 현재 구현은 `controllerchange`가 오지 않아도 1.5초 뒤 `window.location.reload()`를 실행한다. 새 worker가 아직 installing/waiting 상태이면 reload 후 같은 업데이트 처리를 다시 만나 반복 새로고침과 인증 bootstrap 재진입이 발생할 수 있다.
4. `feature-login.js`의 `initLoginScreen()`은 `DOMContentLoaded`에 한 번만 바인딩되어 있어 중복 바인딩이 1차 원인은 아니다.

## 가설

1. `pwa-register.js`의 timeout fallback reload가 새 worker 제어권 획득 없이 reload를 반복한다.
   - 확인 증거: `setTimeout(reloadOnce, APP_SW_AUTO_RELOAD_TIMEOUT_MS)`가 `controllerchange` 여부와 무관하게 실행된다.
   - 기대 수정: reload는 `controllerchange`에서만 수행하고, timeout은 배너 fallback으로 전환한다.
2. 로그인 초기화가 중복 바인딩되어 자동 로그인/로그아웃이 반복된다.
   - 확인 증거: DOMContentLoaded 바인딩은 하나뿐이다.
   - 판정: 반박됨.
3. `feature-login.js`와 `app.js`의 독립 bootstrap이 loading 상태를 여러 번 토글한다.
   - 확인 증거: SW reload loop 수정 후에도 로그인 화면 flicker가 남으면 추가 조사한다.
   - 이번 slice 범위: SW reload loop를 먼저 차단한다.

## 실행 Slice 1

`pwa-register.js`의 앱 Service Worker 업데이트 자동 적용을 안정화한다.

### 구현 범위

1. `controllerchange`가 실제로 발생한 경우에만 자동 reload한다.
2. timeout은 reload가 아니라 업데이트 배너 fallback으로 처리한다.
3. 같은 worker update에 대한 자동 적용은 세션당 1회만 시도해 반복 reload를 막는다.
4. `pwa-register.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.
5. `index.html`의 `pwa-register.js` cache-bust query를 갱신한다.
6. `tests/pwa-update-auto-reload.test.js`에 회귀 테스트를 추가/수정한다.

### 하지 않을 것

1. 로그인/계정 구조를 리팩터링하지 않는다.
2. Firebase 계정 데이터나 Firestore rules를 변경하지 않는다.
3. unrelated PWA 설치/FCM 흐름을 바꾸지 않는다.

## 검증 계획

1. RED: timeout fallback이 `controllerchange` 없이 reload하지 않아야 한다는 테스트를 먼저 실패시킨다.
2. GREEN: `node --test tests/pwa-update-auto-reload.test.js`.
3. 정적 검증: `node --check pwa-register.js`, `node --check sw.js`.
4. 전체 회귀: `node --test tests/*.test.js`.
5. 자산 검증: `npm.cmd run verify:assets`.
6. 운영 검증: `origin/main` 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`.
7. 브라우저 검증: 배포 URL에서 앱 SW 업데이트 fallback harness로 `controllerchange` 없는 timeout이 reload하지 않는지 확인한다.

## 실행 요약

1. `pwa-register.js`의 자동 업데이트 적용 경로에서 timeout fallback이 더 이상 `window.location.reload()`를 호출하지 않도록 수정했다.
2. 자동 reload는 실제 `navigator.serviceWorker` `controllerchange`가 발생했을 때만 수행한다.
3. `SKIP_WAITING` 요청 후 `controllerchange`가 오지 않거나 `postMessage`가 실패하면 앱 업데이트 배너로 fallback한다.
4. 같은 service worker update key에 대한 자동 적용은 `sessionStorage` 기준 한 탭 세션에서 1회만 시도해 반복 새로고침을 막는다.
5. active workout draft가 있으면 자동 reload를 하지 않고 업데이트 배너만 보여주는 기존 보호 의도를 행동 테스트로 고정했다.
6. `pwa-register.js`와 `index.html`이 `STATIC_ASSETS`에 포함되어 있어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260706z6-sw-reload-stability`로 bump했다.

## 로컬 검증

1. PASS: RED focused test - 기존 `setTimeout(reloadOnce, APP_SW_AUTO_RELOAD_TIMEOUT_MS)` 경로 때문에 실패 확인.
2. PASS: `node --test tests/pwa-update-auto-reload.test.js` - 5 pass.
3. PASS: `node --check pwa-register.js`.
4. PASS: `node --check sw.js`.
5. PASS: `node --check tests/pwa-update-auto-reload.test.js`.
6. PASS: `node --test tests/*.test.js` - 713 pass.
7. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=882`.
8. PASS: `git diff --check`.
9. PASS: review-work lanes after rerun:
   - context mining PASS.
   - QA PASS.
   - code quality PASS, no blockers.
   - security PASS, severity NONE.
   - goal/constraint gate found only deployment/docs/test-slop blockers; test-slop was fixed and docs/production deploy were completed in the follow-up commit.

## 운영 검증

1. PASS: `npm.cmd run deploy:production` - pushed `95cb27110d45` to `origin/main`.
2. PASS: deploy verification - `[deploy-verify] ok 95cb27110d45 tomatofarm-v20260706z6-sw-reload-stability static=242`.
3. PASS: deployed marker verification - `index.html` app marker, `app.js` build-info marker, `sw.js` cache version marker.
4. PASS: deployed asset HTTP status - `index.html`, `pwa-register.js`, `sw.js` all returned HTTP 200 from `https://aretenald2018-sys.github.io/tomatofarm/`.
5. PASS: deployed PWA refresh-loop harness:
   - timeout without `controllerchange`: `reloads=0`, `banners=1`.
   - same SW update key: first auto apply `true`, second auto apply `false`, `messages=1`.
   - real `controllerchange`: `reloads=1`.
   - active workout draft: `reloads=0`, `banners=1`.

## 다음 실행 프롬프트

완료. 다음 액션 없음.
