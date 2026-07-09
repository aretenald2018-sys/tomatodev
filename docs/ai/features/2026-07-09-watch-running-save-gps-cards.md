# 2026-07-09 갤럭시워치 러닝 저장/GPS/카드 스택 수정 계획

## 상태

- 상태: `reviewed_local_verified_production_not_verified`
- 사용자 요청: 갤럭시워치 러닝 저장이 운동탭 1회차에 저장되지 않고 러닝에만 저장되어야 한다. 러닝 GPS는 실제 궤적을 그릴 수 있어야 하며, 러닝을 여러 번 저장하면 러닝 탭에 카드가 스택되어야 한다.
- 적용 흐름: `/diagnose` 우선, `$omo:ulw-loop`로 목표/기준/증거를 추적한다.
- ULW 세션: `watch-running-save-gps-cards-20260709`
- ULW 목표: `G001-1-gps`

## 진단 결과

1. `workout/wear-bridge.js`는 웨어 러닝 payload를 `S.workout.runData`에 넣은 뒤 `cardio:treadmill-running` 운동 엔트리도 추가한다. 이 때문에 러닝이 운동 1회차 카드처럼 보일 수 있다.
2. 같은 저장 경로가 `S.workout.sessionIndex`를 러닝 전용 인덱스 `2`로 맞추지 않는다. `saveWorkoutDay()`는 현재 세션 인덱스를 기준으로 저장하므로 웨어 저장이 1회차로 들어갈 수 있다.
3. `render-calendar.js`의 러닝 탭은 현재 `_runningTrackSessionInfo()`가 선택한 러닝 세션 1개만 `_workoutMetrics()`에 전달한다. 여러 러닝 세션이 있어도 카드가 한 장으로 보인다.
4. Wear Health Services 시작 경로는 `requestedDataTypes()`와 기기 capability의 교집합을 최종 요청 타입으로 사용해야 한다. 지원되지 않는 `DataType.LOCATION`을 강제로 다시 넣으면 Health Services start 자체가 실패할 수 있다.
5. 러닝 카드와 지도 렌더러 자체는 이미 `runRoute`/`runRouteSummary`를 받아 궤적을 그릴 수 있다.

## 결정

1. 웨어 러닝 저장은 운동 엔트리(`exercises`)를 만들지 않는다. 러닝 세션 필드만 저장한다.
2. 웨어 러닝은 `WORKOUT_RUNNING_SESSION_INDEX = 2`부터 시작해 다음 빈 러닝 세션 슬롯에 저장한다. 기존 헬스 1회차/2회차는 보존한다.
3. 같은 웨어 러닝 payload가 재전송되면 `startedAt`/`endedAt`이 같은 기존 러닝 세션을 갱신하고, 다른 러닝이면 다음 슬롯에 추가한다.
4. 러닝 탭은 2번 이후의 모든 러닝 세션을 `activities` 카드로 펼쳐서 카드가 스택되도록 렌더링한다.
5. Wear 쪽은 위치 권한과 기기 capability가 모두 허용한 `DataType.LOCATION`만 요청하고, 지원되는 위치/심박 데이터 타입은 `WarmUpConfig`로 `prepareExerciseAsync()` 후 시작한다. route point가 최종 JSON payload에 남는 계약을 테스트한다.
6. `workout/wear-bridge.js`, `render-calendar.js`, `sw.js`는 `STATIC_ASSETS` 대상이므로 앱 JS를 바꾸면 `CACHE_VERSION`을 함께 bump한다.

## 실행 Slice 1

수정 대상:

- `workout/wear-bridge.js`
- `workout/index.js`
- `render-calendar.js`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt`
- `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutBridge.kt`
- `tests/wear-workout-bridge.test.js`
- `tests/wear-gps-running-contract.test.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `sw.js`

하지 않을 일:

- `www/` 직접 편집
- Firestore 직접 호출 추가
- 러닝 tracker UI 전체 재설계
- 헬스 1회차/2회차 세션 구조 변경

## 검증 계획

1. RED/GREEN: `node --test tests/wear-workout-bridge.test.js tests/wear-gps-running-contract.test.js`
   - 웨어 러닝 저장 후 `exercises`가 비어 있고, 러닝 전용 세션 인덱스가 쓰이며, GPS route point가 보존되어야 한다.
2. RED/GREEN: `node --test tests/workout-calendar-bottom-sheet.test.js`
   - 러닝 세션 2개 이상이 러닝 탭에서 `.wt-running-read-card` 여러 장으로 렌더링되는 계약을 확인한다.
3. 정적 검사: `node --check workout/wear-bridge.js && node --check render-calendar.js && node --check sw.js`
4. Android/Wear 검사: `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" .\android\gradlew.bat -p android :app:compileDebugKotlin :wear:testDebugUnitTest`
5. Asset 검사: `npm.cmd run verify:assets`
6. 가능하면 전체 Node test file 목록 실행.
7. 실기기 GPS는 현재 ADB 연결 기기가 없으면 `not verified yet`으로 남기고, 실행 명령과 확인 UI를 기록한다.
8. 배포가 안전하면 관련 파일만 commit/push 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`로 운영 Pages 자산을 확인한다.

## 실행 결과

1. `workout/wear-bridge.js`:
   - 웨어 러닝 저장에서 운동 `exercises` 생성과 cardio entry upsert를 제거했다.
   - 러닝 전용 session index `2`부터 저장하고, 동일 `startedAt`/`endedAt` 재전송은 같은 슬롯을 갱신하며 다른 러닝은 다음 러닝 슬롯에 쌓는다.
   - precise route는 같은 페이지 생명주기 동안 volatile memory queue로 재시도하고, persistent `localStorage` queue에는 `route: []`와 `redacted routeSummary`만 남긴다.
2. `workout/index.js`: wear bridge에 `getDay()`를 주입해 기존 `workoutSessions`를 보고 러닝 슬롯을 결정하게 했다.
3. `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt`:
   - `supportedDataTypes` 필터 뒤 `DataType.LOCATION` 강제 재추가를 제거했다.
   - 지원되는 `LOCATION`/`HEART_RATE_BPM`만 `WarmUpConfig`에 넣어 `prepareExerciseAsync()` 후 start한다.
4. `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutBridge.kt`:
   - 네이티브 phone bridge는 WebView가 살아 있는 동안 precise payload를 바로 drain하고, app-private `SharedPreferences` retry queue에는 raw JSON 대신 allow-list safe payload만 재구성해 저장한다.
   - Web persistent `localStorage` queue는 `route: []`, `samples10s: []`, `routeSummary.redacted: true`만 남기지만, native `SharedPreferences` queue는 WebView/app 재시작 후 궤적을 복구할 수 있도록 timestamp/lat/lng/altitude/bearing/segmentId/gapBefore/gapReason만 검증해서 보존하고 arbitrary top-level GPS dump와 samples는 제거한다.
5. `render-calendar.js`:
   - 러닝 탭은 `WORKOUT_RUNNING_SESSION_INDEX` 이후 모든 러닝 세션을 러닝 카드로 펼친다.
   - legacy running index `0`은 delete/toggle target을 `0`으로 보존한다.
   - 지도는 탭 진입 시 자동 provider load를 하지 않고, 카드별 `경로 보기` 클릭 시 해당 map shell만 활성화한다.
6. `style.css`: lazy route button과 inactive map shell 상태를 추가했다.
7. `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260709z11-watch-running-gps-cards`로 bump했다.
8. 테스트:
   - `tests/wear-workout-bridge.test.js`에 running-only 저장, distinct run stacking, persistent queue route redaction + volatile precise drain 검증을 추가했다.
   - `tests/wear-gps-running-contract.test.js`에 capability-safe GPS warm-up 계약과 route 보존 검증을 추가했다.
   - `tests/workout-calendar-bottom-sheet.test.js`에 실제 helper source 기반 running stack/legacy index 검증과 route lazy-load 계약을 추가했다.

## 검증 결과

1. PASS focused JS: `node --test tests/wear-workout-bridge.test.js tests/wear-gps-running-contract.test.js tests/workout-calendar-bottom-sheet.test.js` - 44 tests, 44 pass.
2. PASS Android app/wear: `export JAVA_HOME='/c/Program Files/Android/Android Studio/jbr'; ./android/gradlew.bat -p android :app:compileDebugKotlin :wear:testDebugUnitTest` - BUILD SUCCESSFUL.
3. PASS full JS: `node --test tests/*.test.js` - 774 tests, 774 pass.
4. PASS assets: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=914`.
5. PASS syntax: `node --check workout/wear-bridge.js && node --check render-calendar.js && node --check workout/index.js && node --check sw.js`.
6. PASS browser QA: actual `_renderWorkoutRunningDetailCard` helper render, mobile viewport, 2 stacked cards, no overlap, pre-click mapCalls `0`, first `경로 보기` click mapCalls `1` with `pointCount=2`, second card inactive. Evidence: `.omo/evidence/watch-running-save-gps-cards-20260709/c003-running-cards-real-render/`.
7. PASS whitespace: `git diff --check` with CRLF warnings only.
8. LSP diagnostics not run: JS `typescript` LSP and Kotlin `kotlin-ls` are not installed in this checkout.
9. not verified yet: physical Galaxy Watch GPS capture/phone Data Layer save. Blocker: `adb` not available/found and no paired device attached.
10. not verified yet: production Pages deploy/verify. Blocker: current worktree contains unrelated dirty APK/life-zone/build-info/test changes and local branch is behind `origin/main`.

## 완료 기준

- 갤럭시워치 러닝 저장이 운동 1회차의 헬스/유산소 카드로 나타나지 않는다.
- 러닝 저장 payload의 `runRoute`가 2개 이상의 좌표를 보존해 지도 궤적 렌더링 대상이 된다.
- 같은 날 러닝 2회 이상 저장 시 러닝 탭에서 카드가 2장 이상 스택된다.
- `sw.js` cache version이 변경 파일과 함께 갱신된다.
- `docs/ai/NEXT_ACTION.md`에 실행/검증/리뷰 상태가 남는다.
