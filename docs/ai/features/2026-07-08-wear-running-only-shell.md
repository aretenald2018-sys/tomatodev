# 갤럭시워치 러닝 전용 셸 정리 계획

## 요청

현재 갤럭시워치에 구현된 6개 화면을 모두 삭제하고, 관련 UX/UI 코드를 제거한다. 워치 앱은 Tomato Farm의 러닝 시작과 러닝 결과 저장 기능에만 연결한다. 러닝 중에는 시간, 거리, 심박수 정보가 반드시 워치 화면에 동시에 보여야 한다.

## 그릴 결과

- 핵심 질문: 6개 화면 삭제가 `런닝/조깅` 화면까지 제거하라는 뜻인가, 아니면 6-page 대시보드만 제거하라는 뜻인가?
- 결정: 6-page 대시보드와 운동 캐러셀/준비중/오늘 운동 목록 UI를 제거하고, 워치 앱 첫 화면을 러닝 전용 start 상태로 바꾼다. 단, 러닝 시작/진행/일시정지/종료/저장 상태는 하나의 러닝 workflow 상태로 유지한다.
- 추천 기본값: `PICKER`라는 이름은 더 이상 쓰지 않고 `READY`, `ACTIVE`, `PAUSED`, `SUMMARY` 같은 러닝 전용 상태명으로 바꾼다.
- 남은 가정: paired Android phone/watch 또는 Android Studio paired emulator가 있어야 최종 Data Layer 저장 완료까지 검증할 수 있다. 단순 Wear AVD만 있으면 워치 화면과 `폰 연결 대기` fallback까지만 검증 가능하다.

## 현재 코드 관찰

1. `android/wear/src/main/res/layout/activity_main.xml`은 `ViewPager2`와 우측 `dot0`-`dot5` 6개 indicator를 렌더한다.
2. `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`는 `PageAdapter.getItemCount() = 6`이고 `page_streak`, `page_checkin`, `page_workout`, `page_week`, `page_stocks`, `page_timer`를 vertical pager로 바인딩한다.
3. 같은 `MainActivity.kt` 안에 streak/checkin/week/stocks/timer용 바인딩과 timer state, Yahoo Finance fetch, `FirebaseHelper.fetchWorkouts()/fetchCalEvents()`가 남아 있다.
4. `android/wear/src/main/res/layout/page_workout.xml`은 러닝 기능을 포함하지만, 상단에 걷기/자전거/로잉/스텝 준비중 carousel과 오늘 운동 목록 `wo_list`도 같이 가진다.
5. `WearWorkoutUiController`는 러닝 start/pause/resume/final stop과 `WearExerciseService`/`WearWorkoutDataLayer.sendRunComplete()` 연결을 이미 담당한다.
6. `WearExerciseService`는 Health Services `ExerciseClient`로 running metric을 수집하며 `HEART_RATE_BPM`, `DISTANCE_TOTAL`, `LOCATION`을 조건부 요청한다.
7. phone 저장 경계는 `workout/wear-bridge.js`의 `saveWearWorkoutPayload()`이며, `loadWorkoutDate()` 후 `S.workout.exercises`에 `cardio.source = 'wear-running'` 엔트리를 upsert하고 `saveWorkoutDay({ silent: true })`를 호출한다.
8. `DESIGN.md`는 Tomato Farm을 검은/조용한 모바일 로깅 surface와 tomato red accent로 정의한다. 워치 화면은 이 방향을 유지하되, 새 UI에는 이모지 아이콘을 추가하지 않는다.

## 실행 Slice 1: Wear 러닝 전용 셸로 축소

### 범위

1. `android/wear/src/main/res/layout/activity_main.xml`
   - `ViewPager2`와 6-dot indicator를 제거한다.
   - 단일 러닝 host layout만 남긴다. 구현 방식은 `page_workout.xml`을 include하거나 `activity_main.xml` 자체를 러닝 전용 root로 바꾸는 방식 중 기존 Android 리소스 구조에 가장 작은 변경을 택한다.

2. `android/wear/src/main/res/layout/page_workout.xml`
   - 걷기/자전거/로잉/스텝 준비중 carousel, `wearWorkoutCarousel`, `wearWorkoutCarouselStrip`, `wo_list`, 오늘 앱 기록 영역을 제거한다.
   - 첫 상태는 러닝 시작 화면만 보여준다.
   - active 상태에는 `runActiveElapsed`, `runActiveDistance`, `runActiveHeartRate`가 같은 화면에 동시에 보여야 한다. 심박 권한/센서가 없을 때도 `-- bpm` 또는 권한 상태가 같은 자리에서 보인다.
   - pause/resume/final stop/summary는 러닝 workflow 상태로만 유지한다.

3. `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`
   - `ViewPager2`, `RecyclerView`, `PageAdapter`, `dotIds`, six-page binding, streak/checkin/week/stocks/timer code를 제거한다.
   - `FirebaseHelper.fetchWorkouts()`/`fetchCalEvents()` 로딩을 제거한다. 워치는 Firestore를 읽거나 직접 쓰지 않는다.
   - `setContentView()` 후 러닝 layout을 `WearWorkoutUiController.bind()`에 직접 연결하고, 기존 운동 권한 요청은 유지한다.
   - `timerSeconds`, `timerRunning`, `CountDownTimer`, stock fetch, weekly calendar 계산 등 비러닝 상태를 제거한다.

4. `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt`
   - coming soon 버튼 listener와 carousel centering을 제거한다.
   - `WearRunUiState`의 초기 상태명을 `READY` 계열로 바꾸고, start button binding은 유지한다.
   - `WearExerciseService.startRun/pauseRun/resumeRun/endRun` 호출과 `WearWorkoutDataLayer.sendRunComplete()` 호출은 유지한다.

5. `android/wear/src/main/java/com/lifestreak/wear/FirebaseHelper.kt`
   - `MainActivity`에서 더 이상 쓰지 않으면 삭제한다. 다른 참조가 있으면 먼저 제거 대상/보존 사유를 확인한다.

6. `android/wear/build.gradle`
   - `ViewPager2`/`RecyclerView` dependency가 wear module에서 더 이상 필요 없으면 제거한다.
   - `Health Services`, `play-services-wearable`, `guava`, Kotlin/JUnit test dependency는 유지한다.

7. Tests
   - `tests/wear-slice2-artifacts.test.js`는 새 요구에 맞춰 갱신하거나 `tests/wear-running-only-shell.test.js`로 대체한다.
   - 기존 `tests/wear-workout-bridge.test.js`, `tests/wear-slice3-health-services.test.js`, `tests/wear-gps-running-contract.test.js`, `android/wear/src/test/...`는 유지/갱신한다.

### 반드시 없어야 하는 것

- 워치 first surface의 6-page pager, 우측 6-dot indicator, vertical swipe 대시보드.
- `page_streak.xml`, `page_checkin.xml`, `page_week.xml`, `page_stocks.xml`, `page_timer.xml`를 참조하는 runtime code.
- 운동 carousel의 준비중 버튼 또는 비러닝 후보.
- Watch module의 Firestore 직접 읽기/쓰기 경로.
- `www/` 직접 수정.

### 반드시 남아야 하는 것

- `WearExerciseService` 기반 러닝 시작/일시정지/재개/종료.
- active 러닝 화면의 시간, 거리, 심박수 표시.
- final stop에서 `/tomato/workout/run/complete` Data Layer message 전송.
- phone WebView bridge의 `saveWorkoutDay({ silent: true })` 저장 경계.
- 심박/GPS 권한이 없어도 앱 crash 없이 fallback 표시.

## 검증 계획

1. RED
   - 새 또는 갱신 테스트 `node --test tests/wear-running-only-shell.test.js`가 현재 코드에서 실패해야 한다.
   - 실패 조건: `ViewPager2`, `getItemCount() = 6`, `dot0`-`dot5`, old page layout refs, `walkComingSoonButton`, `wearWorkoutCarousel`, `wo_list`, `FirebaseHelper.fetchWorkouts` 중 하나라도 남아 있으면 실패한다.

2. GREEN
   - `node --test tests/wear-running-only-shell.test.js`
   - `node --test tests/wear-workout-bridge.test.js tests/wear-slice3-health-services.test.js tests/wear-gps-running-contract.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js`
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :app:assembleDebug :wear:assembleDebug`

3. 실제 워치 surface QA
   - Watch APK 설치 후 앱 실행.
   - 기대: 첫 화면에 러닝 시작 UI만 보이고 6-dot indicator와 vertical swipe page가 없다.
   - `시작` 탭 -> active 화면에서 시간/거리/심박수가 동시에 보인다.
   - `일시정지` -> `재개` -> `최종종료` -> summary sync status까지 확인한다.
   - evidence: `.omo/evidence/wear-running-only-shell-20260708/watch-ready.png`, `watch-active.png`, `watch-paused.png`, `watch-summary.png`, `watch-action-log.md`.

4. paired phone/watch 저장 QA
   - phone APK와 watch APK를 같은 debug signing/applicationId로 설치한다.
   - 폰 앱 로그인 상태에서 워치 러닝을 종료한다.
   - 기대: phone Tomato Farm 해당 날짜 운동 카드/캐러셀에 `wear-running` cardio entry가 저장되고, 거리/시간/심박 요약과 route metadata가 보존된다.
   - evidence: `.omo/evidence/wear-running-only-shell-20260708/phone-card.png`, `data-layer-log.txt`, `phone-save-log.txt`.
   - paired 환경이 없으면 이 항목은 `not verified yet`으로 남기고 완료 처리하지 않는다.

5. 정적 검증
   - `git diff --check`
   - root `STATIC_ASSETS` 파일을 수정한 경우에만 `sw.js` `CACHE_VERSION`을 bump하고 `npm.cmd run verify:assets`를 실행한다.
   - `workout/wear-bridge.js`를 수정하지 않으면 `sw.js` 변경은 하지 않는다.

## 실행 결과

- `activity_main.xml`의 `ViewPager2`와 6-dot indicator를 제거하고 `page_workout.xml` 단일 include로 바꿨다.
- `page_workout.xml`은 `runReadyScreen`, `runActiveScreen`, `runPausedScreen`, `runSummaryScreen`만 남긴 러닝 전용 workflow로 축소했다.
- `MainActivity.kt`에서 `PageAdapter`, `RecyclerView`, `ViewPager2`, dashboard binding, timer, stock fetch, `FirebaseHelper.fetchWorkouts()/fetchCalEvents()` 경로를 제거했다.
- `WearWorkoutUiController.kt`는 coming-soon/carousel 코드를 제거하고 `READY -> ACTIVE -> PAUSED -> SUMMARY` 상태만 렌더한다.
- `WearExerciseService`와 `WearWorkoutDataLayer.sendRunComplete()` 저장 연결은 유지했다.
- old 6-page layout과 관련 helper/drawable을 삭제했다.
- `android/wear/build.gradle`에서 unused `RecyclerView`/`ViewPager2` dependency를 제거했다.
- `tests/wear-running-only-shell.test.js`를 추가하고 `tests/wear-slice2-artifacts.test.js`, `WearRunUiStateTest.kt`를 새 계약으로 갱신했다.

## 실행 검증

1. PASS RED: `node --test tests/wear-running-only-shell.test.js`가 기존 코드에서 4개 테스트 실패를 냈다. 로그: `.omo/evidence/wear-running-only-shell-20260708/red-wear-running-only-shell.txt`.
2. PASS GREEN: `node --test tests/wear-running-only-shell.test.js tests/wear-slice2-artifacts.test.js tests/wear-workout-bridge.test.js tests/wear-slice3-health-services.test.js tests/wear-gps-running-contract.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js` - 30 tests, 30 pass. 로그: `.omo/evidence/wear-running-only-shell-20260708/green-js-tests.txt`.
3. PASS Gradle: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug :app:assembleDebug` - BUILD SUCCESSFUL. 로그: `.omo/evidence/wear-running-only-shell-20260708/gradle-wear-app.txt`.
4. PASS Wear emulator QA: `TomatoWearSmallRound`에 Wear APK 설치 후 첫 화면 `watch-ready.png`, active 화면 `watch-active.png`, pause `watch-paused.png`, summary `watch-summary.png`를 캡처했다. active 화면은 시간/거리/심박수를 동시에 표시하고 6-dot/pager가 없다.
5. PASS fallback QA: `BODY_SENSORS` denied/user-fixed 상태에서 앱을 실행해 `watch-permission-fallback.png`를 캡처했다. 앱은 crash 없이 시간/거리/심박수 슬롯을 유지하고 심박수는 `-- bpm`으로 fallback한다. 로그: `permission-fallback-log.txt`.
6. PASS cleanup: `BODY_SENSORS` permission/appops를 복구하고 `emulator-5554`를 종료했다. 로그: `watch-action-log.md`.
7. not verified yet: paired phone/watch Data Layer 저장 완료와 phone WebView `saveWorkoutDay({ silent: true })` 실제 호출은 paired phone node가 없어 on-device로 검증하지 못했다. 정적/단위 테스트는 통과했고 watch summary는 `폰 연결 대기`를 표시했다. 로그: `phone-save-log.txt`, `data-layer-log.txt`.

## 2026-07-09 사용자 피드백 후속 수정

- 증상: 실제 Galaxy Watch에서 러닝 종료 후 `폰 저장 payload 오류`가 표시되고 phone Tomato Farm 운동 탭의 `러닝`에 기록이 저장되지 않는다.
- 진단: 해당 문구는 phone/PWA 저장 단계가 아니라 `WearWorkoutUiController.syncRunSummary()`의 watch-side `WearRunSession.toPayload()` 실패 경로다. Health Services `activeDurationMs`가 1초 미만인 테스트/짧은 러닝에서 `durationSec=0`이 되어 payload 검증이 실패할 수 있었다.
- PWA 결론: PWA 브라우저 단독은 Wear OS Data Layer message를 받을 native listener가 없다. watch -> phone 저장은 phone Android APK의 `TomatoWearWorkoutListenerService`/`TomatoWearWorkoutBridge`가 받아 WebView `workout/wear-bridge.js`로 넘기는 구조이므로 phone APK가 필요하다.
- 수정:
  1. `WearWorkoutUiController.kt`에 `buildWearRunSessionForSummary()`를 추가하고 종료 payload duration을 `maxOf(exerciseSnapshot.activeDurationMs, uiSnapshot.durationMs, 1_000L)`로 계산한다.
  2. `WearRunUiStateTest.kt`에 1초 미만 duration에서도 payload `durationSec=1`이 되는 회귀 테스트를 추가했다.
  3. `.gitignore`에 phone workout bridge, Wear source/layout/test/build.gradle 정확한 예외를 추가해 핵심 native 변경이 git diff에 보이도록 했다.
  4. `tests/wear-running-only-shell.test.js`, `tests/wear-app-refresh-update.test.js`에 gitignore/underflow 회귀 계약을 추가했다.
- 검증:
  1. PASS RED: `node --test tests/wear-running-only-shell.test.js`가 수정 전 ignored 파일 목록 때문에 실패.
  2. PASS GREEN: `node --test tests/wear-running-only-shell.test.js` - 5 tests, 5 pass.
  3. PASS: `node --test tests/wear-running-only-shell.test.js tests/wear-workout-bridge.test.js tests/wear-slice3-health-services.test.js tests/wear-gps-running-contract.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js tests/wear-app-refresh-update.test.js` - 33 tests, 33 pass.
  4. PASS: `git diff --check` exited 0 with existing CRLF warnings only.
  5. not verified yet: Galaxy Watch ADB는 `192.168.0.106:46473 offline`이고 reconnect가 `10060` timeout으로 실패했다. 실제 phone save flow는 재페어링 후 phone APK와 watch APK를 모두 설치해 검증해야 한다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-08-wear-running-only-shell.md`와 `docs/ai/diagnoses/2026-07-09-wear-running-phone-save-payload.md`를 읽고 paired phone/watch 저장 QA를 수행한다. phone APK와 watch APK를 모두 설치한 뒤 phone 앱 로그인 상태에서 워치 러닝 `시작 -> 최종종료`를 수행하고, phone Tomato Farm 운동 탭 해당 날짜 `러닝` 카드에 `wear-running` cardio entry가 저장되는지 확인한다.
