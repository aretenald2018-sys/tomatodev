# 2026-07-09 갤럭시워치 러닝 저장/GPS/카드 스택 리뷰

## 상태

- 결과: `complete_production_verified_physical_device_not_verified`
- 계획: `docs/ai/features/2026-07-09-watch-running-save-gps-cards.md`
- ULW 목표: `G001-1-gps`

## 변경 파일

- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt`
- `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutBridge.kt`
- `workout/wear-bridge.js`
- `workout/index.js`
- `render-calendar.js`
- `style.css`
- `sw.js`
- `tests/wear-workout-bridge.test.js`
- `tests/wear-gps-running-contract.test.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache marker를 참조하는 기존 `tests/*.test.js`
- `.omo/evidence/watch-running-save-gps-cards-20260709/c003-running-cards-real-render/`

## 리뷰 결과

1. PASS: 웨어 러닝 저장은 `exercises`를 만들지 않고 러닝 전용 세션 index `2+`에만 저장한다.
2. PASS: 같은 웨어 payload는 같은 러닝 슬롯을 갱신하고, 다른 러닝은 다음 러닝 슬롯에 쌓는다.
3. PASS: Wear Health Services는 `supportedDataTypes` 필터 뒤 `DataType.LOCATION`을 강제 재추가하지 않는다. 지원되는 `LOCATION`/`HEART_RATE_BPM`만 `WarmUpConfig`로 warm-up한다.
4. PASS: Web `localStorage` wear queue에는 precise GPS route points를 저장하지 않는다. Native phone `SharedPreferences` retry queue는 app-private restart recovery를 위해 raw JSON이 아니라 allow-list sanitized route/gap fields만 저장하고, 같은 page/process lifetime 안에서는 volatile memory queue로 precise route를 drain한다.
5. PASS: 러닝 상세 지도는 카드별 `경로 보기` 클릭 전에는 `renderRunningMap()`을 호출하지 않는다.
6. PASS: legacy running index `0`은 delete/toggle target이 `2`로 바뀌지 않는다.

## 검증

1. PASS: `node --test tests/wear-workout-bridge.test.js tests/wear-gps-running-contract.test.js tests/workout-calendar-bottom-sheet.test.js` - 45 tests, 45 pass.
2. PASS Android app/wear: `export JAVA_HOME='/c/Program Files/Android/Android Studio/jbr'; ./android/gradlew.bat -p android :app:compileDebugKotlin :wear:testDebugUnitTest` - BUILD SUCCESSFUL.
3. PASS: `node --test --test-concurrency=1 tests/*.test.js` - 776 tests, 776 pass.
4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=904`.
5. PASS: `node --check workout/wear-bridge.js && node --check render-calendar.js && node --check workout/index.js && node --check sw.js`.
6. PASS: Puppeteer mobile QA - 실제 `_renderWorkoutRunningDetailCard` helper로 2개 러닝 카드를 렌더했고, 클릭 전 mapCalls `0`, 첫 카드 `경로 보기` 클릭 후 mapCalls `1`/`pointCount=2`, 두 번째 카드는 inactive, 카드 overlap 없음. Evidence: `.omo/evidence/watch-running-save-gps-cards-20260709/c003-running-cards-real-render/running-stack-real-render-mobile.json`.
7. PASS: `git diff --check` - CRLF warnings only.
8. PASS production deploy: commit `6c9dcb00e3ee1f144a7d3da70bd2b45cc33f261e` pushed to `origin/main`; `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 6c9dcb00e3ee1f144a7d3da70bd2b45cc33f261e` returned `[deploy-verify] ok 6c9dcb00e3ee tomatofarm-v20260709z12-watch-running-gps-gap-resilience static=260`.
9. PASS production browser QA: read-only browser fixture opened `운동 -> 해당 날짜 sheet -> 러닝`, rendered 2 stacked running cards, confirmed 2 `경로 보기` buttons, clicked the first route, and saw 1 active route map with `GPS 중단 구간 1개 · 기록 구간 2개` copy.
10. Evidence logs:
   - `.omo/evidence/watch-running-save-gps-cards-20260709/final-verification/focused-js.log`
   - `.omo/evidence/watch-running-save-gps-cards-20260709/final-verification/android-app-wear-compile.log`
   - `.omo/evidence/watch-running-save-gps-cards-20260709/final-verification/verify-assets.log`
   - `.omo/evidence/watch-running-save-gps-cards-20260709/final-verification/node-check.log`
   - `.omo/evidence/watch-running-save-gps-cards-20260709/final-verification/full-node-tests.log`

## 재리뷰 결과

1. PASS security rereview: persistent queue privacy split으로 이전 BLOCK 원인이 해소됐다. Web `localStorage`는 route-redacted 상태를 유지하고, native `SharedPreferences`는 app-private sanitized route/gap retry payload만 보존한다.
2. PASS security rereview after time-window fix: Web persistent queue allow-list redaction and Android native route missing/equal/inverted/out-of-window sanitization passed.
3. PASS gate rereview: local/static/browser/Android evidence와 production deploy 기준 구현 gate 통과. Physical Watch E2E는 별도 blocker로 남긴다.

## 미검증/차단

현재 기준 남은 미검증은 physical Watch/phone E2E뿐이다. Production Pages deploy/verify와 production browser QA는 위 검증 8-9번에서 완료했다.

1. not verified yet: 실제 Galaxy Watch GPS 수신과 phone Data Layer 저장 end-to-end. 차단 사유는 `adb`가 PATH 및 `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`에서 발견되지 않았고 paired device가 없기 때문이다.
2. 완료: production Pages deploy/verify는 검증 8번에서 완료했다.
