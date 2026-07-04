# 2026-07-04 러닝 잠금/GPS 복구 계획

## 요청

런닝 중 화면에 좌우 스와이프가 가능한 것처럼 보이는 페이지 점 표시를 제거한다. 또한 Android에서 배터리 제한 없이 허용했는데도 폰을 잠그고 뛰다가 다시 켜면 로그인부터 다시 시작하고, 러닝 기록과 GPS 궤적 일부가 날아가는 문제를 처리한다.

## 세션 상태

- 상태: `ready_for_execution`
- ULW 세션: `.omo/ulw-loop/running-lock-gps-20260704/`
- 적용 워크플로우: `/diagnose` 우선, `omo:ulw-loop`, `omo:frontend`, `omo:visual-qa`
- 이번 문서 범위: 계획 세션. 앱 코드는 아직 수정하지 않는다.

## 진단 요약

1. 화면 점 표시 원인 확인
   - `workout/running-session.js` `_renderProgress()`가 `<div class="wt-run-live-pages">` 점 3개를 렌더한다.
   - `style.css`에 `.wt-run-live-pages` 스타일이 있어 실제 화면에서 좌우 페이지처럼 보인다.
   - 해당 화면에는 스와이프/페이지 전환 로직이 없으므로 제거 대상이다.

2. 잠금 후 기록 유실 원인 후보
   - 현재 러닝 기록은 `navigator.geolocation.watchPosition()` 기반이다.
   - Android 네이티브 레이어에는 `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, foreground service, background location service가 없다.
   - 따라서 WebView/PWA가 잠금 중 정지되면 GPS point 콜백 자체가 멈출 수 있다. 이것은 웹 코드만으로 완전히 해결할 수 없다.

3. 재시작/로그인 후 복구 취약점
   - `workout/running-session.js`에는 `localStorage` 러닝 draft 저장/복구가 이미 있다.
   - draft key는 `localStorage.currentUser`에서 유저 id를 읽어 만든다.
   - Android WebView가 재시작되거나 localStorage 인증 상태가 흔들리면 로그인 화면으로 돌아갈 수 있고, 러닝 화면을 다시 열기 전까지 draft 복구가 사용자에게 노출되지 않는다.
   - `feature-login.js`와 `data/data-auth.js`에는 IndexedDB 인증 백업이 있지만, 러닝 draft 복구는 그 백업 흐름과 직접 연결되어 있지 않다.

## 반증 가능한 가설

1. H1: 가짜 페이지 점 때문에 사용자는 좌우 스와이프 기능이 있다고 해석한다.
   - 구분 증거: `wt-run-live-pages` DOM/CSS 제거 후 진행 화면에 page indicator가 없어야 한다.
   - 수정: DOM/CSS 제거.

2. H2: 잠금/재시작 후 draft가 살아 있어도 앱 부팅이 러닝 화면을 자동 복구하지 않아 사용자는 로그인/홈 화면에서 기록을 잃은 것처럼 보게 된다.
   - 구분 증거: 현재 `wtOpenRunningSession()`을 직접 호출해야 `_restoreRunningDraftIfAvailable()`가 실행된다.
   - 수정: 로그인/앱 초기화 후 restorable draft가 있으면 러닝 full-screen session을 자동 복구한다.

3. H3: 잠금 중 GPS 궤적이 직선/끊김으로 남는 것은 웹 `watchPosition()`이 background에서 중단되기 때문이다.
   - 구분 증거: Android manifest와 native source에 background location permission/service가 없다.
   - 수정: Capacitor Android foreground service + background location bridge가 필요하다.

## 실행 슬라이스

### Slice 1: 웹 러닝 세션 복구와 가짜 스와이프 affordance 제거

목표: 지금 배포 가능한 웹/Pages 범위에서 데이터 유실을 줄이고, 로그인/재시작 후 사용자가 기존 러닝 세션으로 즉시 돌아오게 한다.

수정 후보:

- `workout/running-session.js`
  - `_renderProgress()`에서 `.wt-run-live-pages` DOM 제거.
  - draft에 `ownerId`를 포함한다.
  - 사용자별 draft key 외에 "최근 활성 러닝 draft" fallback key를 함께 저장한다.
  - 현재 사용자 id가 fallback draft owner와 일치할 때만 복구한다.
  - 앱 부팅 후 호출 가능한 `wtRestoreRunningSessionIfActive()`를 export한다.
  - active/paused/summary draft가 있으면 러닝 화면을 자동 복구하고 active면 watch/ticker를 재시작한다.
- `workout/index.js`, `render-workout.js`
  - 새 복구 함수를 window/export에 연결한다.
- `app.js`
  - 로그인/데이터 로드 후, 일반 팝업보다 먼저 restorable 러닝 draft를 확인해 자동 복구한다.
- `style.css`
  - `.wt-run-live-pages` 관련 스타일 제거.
- `tests/running-entry.test.js`, `tests/running-tracker.test.js`
  - 페이지 점 제거 회귀 테스트 추가.
  - owner/fallback draft normalization 또는 source check 추가.
  - 앱 초기화에서 러닝 draft 복구 hook 호출을 검증한다.
- `sw.js`
  - `workout/running-session.js`, `style.css`, `app.js`, `workout/index.js`, `render-workout.js`는 `STATIC_ASSETS`에 있으므로 `CACHE_VERSION` bump.

검증:

1. RED: 현재 코드에서 `.wt-run-live-pages`가 존재하고, app init 자동 복구 hook이 없어 새 테스트가 실패한다.
2. GREEN:
   - `node --check app.js render-workout.js workout/index.js workout/running-session.js sw.js tests/running-entry.test.js tests/running-tracker.test.js`
   - `node --test tests/running-entry.test.js tests/running-tracker.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
   - `node scripts/verify-runtime-assets.mjs`
   - `git diff --check`
3. 배포 검증:
   - `npm.cmd run deploy:production`
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
   - `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::<new-cache> workout/running-session.js::wtRestoreRunningSessionIfActive app.js::wtRestoreRunningSessionIfActive`
4. 브라우저/시각 검증:
   - 운영 URL 또는 로컬-only 디버깅에서 러닝 진행 화면을 열어 점 indicator가 사라진 screenshot 확인.
   - 실제 인증 세션이 없으면 `not verified yet`로 명시한다.

범위 제외:

- 잠금 중 새 GPS point를 계속 수집하는 네이티브 foreground service는 Slice 1에서 구현하지 않는다.
- GPS 권한 UX/Android permission dialog는 Slice 1에서 건드리지 않는다.

### Slice 2: Android locked-phone GPS를 위한 native foreground location bridge

목표: 폰 잠금 중에도 GPS point를 계속 수집해, 재개/정지 시 경로가 끊기지 않게 한다.

전제:

- 이 슬라이스는 GitHub Pages만으로 검증되지 않는다.
- 실제 Android APK/Capacitor sync/build와 기기 테스트가 필요하다.
- PWA/모바일 브라우저만 사용하는 경우에는 Android OS 정책상 백그라운드 GPS를 보장할 수 없다.

수정 후보:

- `android/app/src/main/AndroidManifest.xml`
  - `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  - Android 14+ foreground service location permission
  - foreground service 선언
- `android/app/src/main/java/com/lifestreak/app/...`
  - foreground notification을 띄우는 `RunningLocationService`
  - 위치 point를 SharedPreferences 또는 Capacitor plugin call/event로 저장/전달
  - `MainActivity`에 plugin 등록 또는 bridge 노출
- `workout/running-session.js`
  - native bridge가 있으면 run start/pause/resume/finish에 맞춰 native tracking start/stop.
  - 앱 복귀 시 native에 쌓인 point를 drain해 route에 병합.
  - native bridge가 없으면 기존 Web geolocation + Slice 1 draft recovery로 fallback.
- 테스트
  - native bridge 부재 시 fallback 경로 유지 source test.
  - native point drain/merge pure helper 단위 테스트.

검증:

1. `npm.cmd run build`는 일반 터미널에서 실행.
2. `npm.cmd run cap:sync`는 일반 터미널에서 실행.
3. Android Studio 또는 기기에서:
   - 러닝 시작
   - 폰 잠금 3분 이상
   - 잠금 해제
   - 러닝 종료/저장
   - 경로 point가 잠금 전/중/후로 이어지는지 확인.

## 성공 기준

1. 진행 화면에서 좌우 스와이프처럼 보이는 페이지 점이 사라진다.
2. 앱이 재시작되거나 로그인/잠금 화면을 거쳐도 활성 러닝 draft가 사용자에게 자동 복구된다.
3. 저장 전 러닝 summary가 거리/시간/route를 보존하고, save 후 2회차 러닝 카드에 반영된다.
4. 정적 asset 변경 시 `sw.js` cache version이 갱신된다.
5. Slice 2 완료 후에만 "잠금 중 GPS 궤적까지 완전 해결"이라고 말할 수 있다.

## 다음 실행 프롬프트

`docs/ai/features/2026-07-04-running-lock-gps-recovery.md`의 Slice 1만 실행한다. 앱 코드 수정 전 RED 테스트를 먼저 만들고, `workout/running-session.js`의 가짜 페이지 점 제거와 러닝 draft 자동 복구 hook을 구현한다. `STATIC_ASSETS` 수정 파일이 포함되므로 `sw.js` `CACHE_VERSION`을 함께 bump한다.
