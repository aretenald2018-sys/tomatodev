# 워치 러닝 GPS gap resilience 리뷰

## 결론

로컬/production 검증 기준으로 통과했다. 기존 웹/PWA 러닝 GPS gap split은 이미 반영되어 있었고, 이번 Slice는 갤럭시워치 저장 경로에서 빠졌던 gap metadata 보존, timestamp gap 추론, phone native restart queue 보존을 보강했다.

## 반영 내용

1. `workout/wear-bridge.js`
   - 워치 route point의 `segmentId`, `gapBefore`, `gapReason`을 보존한다.
   - 45초 초과 timestamp 공백은 `gapBefore: true`, `gapReason: "time-gap"`으로 추론한다.
   - `routeSummary`에 `segmentCount`, `gapCount`, `interrupted`를 저장한다.
   - `runData.routeSummary`와 web persistent queue redacted summary도 gap summary를 유지한다.
2. `android/wear/.../WearRunPayload.kt`
   - Wear route point/summary JSON schema에 gap metadata를 추가했다.
   - native payload normalization이 metadata 없는 timestamp gap도 추론한다.
   - route distance fallback은 gap edge를 합산하지 않는다.
3. `android/wear/.../WearExerciseMetricAccumulator.kt`
   - Health Services location update가 45초 이상 끊겼다가 재개되면 새 segment로 표시한다.
4. `android/app/.../TomatoWearWorkoutBridge.kt`
   - phone bridge payload limit을 GPS route payload에 맞게 확장했다.
   - native `SharedPreferences` retry queue는 raw JSON을 그대로 저장하지 않고 allow-list payload를 재구성한다.
   - WebView 재시도용 route는 정규화해 보존하고, `samples10s`와 임의 top-level 좌표 필드는 저장하지 않는다.
5. `sw.js`
   - `CACHE_VERSION`을 `tomatofarm-v20260709z12-watch-running-gps-gap-resilience`로 bump했다.

## 검증

1. RED: `node --test tests/wear-workout-bridge.test.js`
   - 구현 전 `segmentId`가 `undefined`가 되어 실패했다.
2. PASS focused: `node --check workout/wear-bridge.js && node --check sw.js && node --test tests/wear-workout-bridge.test.js tests/wear-gps-running-contract.test.js tests/workout-calendar-bottom-sheet.test.js`
   - 45 tests, 45 pass.
3. PASS targeted native: `./android/gradlew.bat -p android :app:testDebugUnitTest --tests com.lifestreak.app.wear.TomatoWearWorkoutBridgeTest :wear:testDebugUnitTest --tests com.lifestreak.wear.workout.WearRunPayloadTest --tests com.lifestreak.wear.workout.WearExerciseMetricAccumulatorTest`
   - BUILD SUCCESSFUL.
4. PASS final local: `node --check workout/wear-bridge.js && node --check render-calendar.js && node --check workout/index.js && node --check sw.js && node --test tests/wear-workout-bridge.test.js tests/wear-gps-running-contract.test.js tests/workout-calendar-bottom-sheet.test.js && node --test --test-concurrency=1 tests/*.test.js && npm.cmd run verify:assets && ./android/gradlew.bat -p android :app:testDebugUnitTest :wear:testDebugUnitTest && node --test tests/wear-app-refresh-update.test.js && git diff --check`
   - focused JS 45/45, full JS 776/776, `verify:assets` `[runtime-assets] ok refs=904`, Android app/wear unit `BUILD SUCCESSFUL`, APK freshness 6/6.
5. PASS security rereview:
   - Web persistent queue allow-list redaction and Android native route time-window sanitization passed.
6. PASS whitespace: `git diff --check`.
7. PASS production deploy:
   - Commit `6c9dcb00e3ee1f144a7d3da70bd2b45cc33f261e` pushed to `origin/main`.
   - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 6c9dcb00e3ee1f144a7d3da70bd2b45cc33f261e` returned `[deploy-verify] ok 6c9dcb00e3ee tomatofarm-v20260709z12-watch-running-gps-gap-resilience static=260`.
8. PASS production browser QA:
   - Read-only browser fixture opened `운동 -> 해당 날짜 sheet -> 러닝`, rendered 2 stacked running cards, confirmed 2 `경로 보기` buttons, clicked the first route, and saw 1 active route map with `GPS 중단 구간 1개 · 기록 구간 2개` copy.

## 남은 범위

1. Android phone foreground service 기반 지속 GPS 수집은 아직 별도 native slice다.
2. iOS/Core Location background tracking은 현재 repo에 iOS target이 없어 구현하지 않았다.
3. 누락된 GPS 샘플을 보간하지 않는다. 샘플이 없는 구간은 중단 구간으로 남기고 선을 끊는 것이 이번 결정이다.
4. 실기기 Galaxy Watch/phone GPS run은 연결된 기기가 없어 수행하지 않았다.

## 실기기 QA 기준

1. 폰/워치 APK를 설치한다.
2. 워치에서 `런닝 -> 시작` 후 위치 업데이트가 끊길 만한 백그라운드/일시 중단 상황을 만든다.
3. 다시 위치 업데이트를 받은 뒤 `종료 -> 저장`한다.
4. 폰에서 `운동 -> 해당 날짜 -> 러닝 -> 경로 보기`를 열어 러닝 카드가 스택되고, gap 구간이 한 직선으로 이어지지 않는지 확인한다.
