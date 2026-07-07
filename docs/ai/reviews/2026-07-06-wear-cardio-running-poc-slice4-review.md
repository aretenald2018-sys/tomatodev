# Galaxy Watch 유산소/런닝 POC Slice 4 리뷰

## 결론

- 상태: `PASS_WITH_RUNTIME_PAIR_LIMITATION`
- 범위: Wear Data Layer final payload 전송, phone native queue/WebView bridge, root JS workout save bridge.
- 결과: 구현/정적/Gradle/Watch fallback runtime은 통과했다. 현재 에뮬레이터 조합은 reachable Data Layer node가 없어 실제 phone card 생성 screenshot은 실기기 또는 Android Studio paired emulator에서 추가 확인해야 한다.

## 변경 파일

- `android/app/build.gradle`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/lifestreak/app/MainActivity.java`
- `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutBridge.kt`
- `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearWorkoutListenerService.kt`
- `android/wear/build.gradle`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutDataLayer.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt`
- `android/wear/src/main/res/layout/page_workout.xml`
- `workout/wear-bridge.js`
- `workout/index.js`
- `workout/save.js`
- `workout/sessions.js`
- `sw.js`
- `index.html`
- `build-info.json`
- `tests/wear-workout-bridge.test.js`
- `android/app/src/main/assets/public/**` via `npm.cmd run cap:sync`

## 검증

1. RED:
   - `node --test tests/wear-workout-bridge.test.js`
   - native bridge/web bridge 파일 누락으로 실패했다.
2. GREEN:
   - `node --test tests/wear-workout-bridge.test.js`
   - PASS, 2 tests.
3. Focused regression:
   - `node --test tests/wear-workout-bridge.test.js tests/wear-slice3-health-services.test.js tests/wear-slice2-artifacts.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js`
   - PASS, 24 tests.
4. Syntax:
   - `node --check workout/wear-bridge.js && node --check workout/save.js && node --check workout/sessions.js && node --check workout/index.js`
   - PASS.
5. Android asset sync:
   - `npm.cmd run cap:sync`
   - PASS. `android/app/src/main/assets/public/workout/wear-bridge.js` contains `__tomatoWearWorkoutBridge`.
6. Android:
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug`
   - PASS.
7. Watch runtime fallback:
   - phone emulator `BudgetNotifApi35` and Wear emulator `TomatoWearSmallRound` installed synced APKs.
   - Wear flow: picker -> `런닝/조깅` -> active -> pause -> final stop.
   - Summary showed `폰 연결 대기`.
   - `dumpsys activity service WearableService` showed reachable nodes 0, so save completion cannot be proven on this emulator pair.
   - service cleanup: `dumpsys activity services com.lifestreak.app` showed `(nothing)` after stop.

## 리뷰 결과

- Data boundary: phone save uses root JS bridge -> `loadWorkoutDate()` -> `S.workout.exercises` cardio entry -> `saveWorkoutDay({ silent: true })`. Firestore direct access was not added to Wear or native phone listener.
- Preservation: workout save still goes through merge mode and existing diet/photo fields stay outside workout payload. The focused JS bridge test covers existing diet field preservation.
- Data Layer requirement: phone and watch `applicationId` are both `com.lifestreak.app`, matching official Wear OS Data Layer package/signature restriction. Namespace remains unchanged.
- Battery/load: Watch sends only final payload on final stop. No live Data Layer streaming was added.
- UI: Watch summary has explicit sync status and keeps the summary usable even when phone is unreachable.
- 검증 한계: TypeScript/Kotlin LSP servers are not installed, so LSP diagnostics were not run. Current emulator pair is not Data Layer paired, so actual phone card screenshot remains Slice 5/실기기 QA work.

## 근거 파일

- `.omo/evidence/wear-cardio-running-poc/slice4-red-node-test.txt`
- `.omo/evidence/wear-cardio-running-poc/slice4-green-node-test.txt`
- `.omo/evidence/wear-cardio-running-poc/slice4-cap-sync.txt`
- `.omo/evidence/wear-cardio-running-poc/slice4-post-sync-node.txt`
- `.omo/evidence/wear-cardio-running-poc/slice4-post-sync-gradle.txt`
- `.omo/evidence/wear-cardio-running-poc/slice4-watch-summary-fallback.png`
- `.omo/evidence/wear-cardio-running-poc/slice4-wearable-service-before.txt`
- `.omo/evidence/wear-cardio-running-poc/slice4-emulator-cleanup.txt`

## 다음 작업

Slice 5에서 APK 산출, full/focused regression, `npm.cmd run verify:assets`, 최종 리뷰를 수행한다. 실제 paired device가 있으면 watch final stop -> phone card 생성 screenshot을 추가한다.
