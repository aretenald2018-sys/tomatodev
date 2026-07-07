# Galaxy Watch 유산소/런닝 POC 및 APK 계획

## 요청

첨부 사진 4장을 참고해 Tomato Farm Android APK와 Galaxy Watch용 앱을 만든다. 워치 첫 화면은 운동 캐러셀이고, 일단 앱의 유산소/다른 운동 후보를 보여주되 POC 구현은 `런닝/조깅`만 한다. 운동 중 화면에는 거리/시간/페이스 정보와 심박수 실시간 정보를 함께 보여준다. 심박수는 기기 부하를 줄이기 위해 Health Services 기본 batching과 앱 내부 10초 샘플 정규화를 우선한다. 운동 최종 종료 버튼을 누르면 결과가 토마토앱의 그날 운동으로 저장되어야 하며, 폰에서 종목 추가 후 저장한 것처럼 운동 카드/캐러셀 시스템에 들어가야 한다.

## 그릴 결과

- 핵심 질문: 워치가 Firestore를 직접 쓰게 할 것인가, 폰 companion을 통해 기존 토마토앱 저장 경로를 탈 것인가?
- 결정: 워치는 Firestore를 직접 쓰지 않는다. Wear OS Data Layer로 폰 앱에 결과 payload를 전달하고, 폰 앱이 기존 `data.js`/`saveWorkoutDay()` 경계에서 `S.workout.exercises`에 cardio/running 카드 엔트리를 추가한다.
- 근거: 프로젝트 규칙상 Firebase 접근은 `data.js`를 경유해야 하고, `setDoc`/저장 payload 필드 보존이 중요하다. 기존 `android/wear/FirebaseHelper.kt`의 REST 직접 쓰기 방식은 이번 저장 경로로 확장하지 않는다.
- 핵심 질문: 저장 형태를 GPS 러닝 세션으로 할 것인가, 운동 종목 추가 카드로 할 것인가?
- 결정: POC는 사용자 문구의 “폰에서 종목추가해서 저장한 것처럼”을 우선해 `CARDIO_PICKER_EXERCISES` 기반 운동 카드 엔트리로 저장한다. Watch Health Services가 제공한 거리/시간/심박 요약은 `entry.cardio` 메타에 붙인다. GPS route 저장은 후속 slice로 남긴다.
- 남은 가정: 첫 POC는 paired Android phone이 있고, 폰 앱이 설치되어 있다. 폰 앱 WebView가 즉시 저장할 수 없으면 native queue에 payload를 보존하고 다음 앱 실행 때 저장한다.

## 현재 코드 관찰

- `android/settings.gradle`은 이미 `:app`, `:wear`를 포함한다.
- `android/wear/build.gradle`은 `androidx.wear`, `ViewPager2`, `play-services-wearable`을 사용 중이지만 Health Services dependency는 없다.
- `android/app/build.gradle`에는 아직 `wearApp project(':wear')`나 `play-services-wearable` phone-side dependency가 없다.
- `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`는 ViewPager 기반 6개 page를 제공하고, `page_workout.xml`은 오늘 운동 표시 전용이다. 새 운동 캐러셀/런닝 세션 UI는 이 모듈 안에서 별도 화면 상태로 추가해야 한다.
- `android/wear/FirebaseHelper.kt`는 Firestore REST를 직접 읽고 `markTodayWorkout()`으로 `cf=true`를 쓰는 코드가 있다. 이번 POC 저장에는 사용하지 않고 deprecated path로 격리한다.
- 웹/폰 앱 저장 경계는 `workout/save.js`의 `saveWorkoutDay({ silent: true })`이며 내부에서 `_buildWorkoutPayload()`와 `saveDay(ctxKey, payload, { mode: 'merge' })`를 탄다.
- `workout/running-session.js`의 route point와 summary는 이미 `heartRateBpm`, `avgHeartRateBpm`, `cadenceSpm`를 받아 요약할 수 있다.
- `workout/exercises.js`에는 `CARDIO_PICKER_EXERCISES`와 수기 유산소 카드 저장 경로가 있다. Watch 결과 저장도 이 카드 스키마에 맞춘다.
- `DESIGN.md`는 Tomato Farm 모바일 로깅 UI를 “검은/조용한 표면 + tomato red accent + Seed/TDS spacing”으로 정의한다. Watch UI는 첨부 사진의 검은 원형 화면/큰 숫자/원형 버튼 패턴을 따르되, visible UI에 이모지 아이콘을 새로 추가하지 않는다.

## 공식 문서 기준

- Wear OS Health Services `ExerciseClient`는 운동 상태, active duration, metric updates를 제공한다. 공식 문서는 workout state/sensor/ongoing activity/data 관리를 foreground service에 두는 구조를 권장한다.
- Health Services metric updates는 화면이 꺼졌을 때 덜 자주 전달될 수 있지만 샘플링은 유지되며, 기본 batching이 대부분의 운동에 적절하다. `BatchingMode`는 배터리 영향 때문에 꼭 필요한 경우에만 쓴다.
- `MeasureClient`는 짧은 foreground spot measurement용이고, 운동 POC에는 `ExerciseClient`가 더 맞다.
- Wear OS Data Layer API는 paired Wear OS/Android device 사이의 optional communication channel이며 `Wearable.getMessageClient()`/`DataClient` 등으로 접근한다. 전력 문서는 UI state 변화를 전송하고 rapid update를 피하라고 안내한다.
- Data Layer 이벤트 처리는 call status를 확인해야 하며, iOS paired device에는 Data Layer가 동작하지 않는다. 이번 POC 지원 범위는 paired Android phone이다.

참고 링크:

- https://developer.android.com/health-and-fitness/health-services/active-data
- https://developer.android.com/health-and-fitness/health-services/active-data/measure-client
- https://developer.android.com/training/wearables/data/overview
- https://developer.android.com/training/wearables/data/client-types
- https://developer.android.com/training/wearables/apps/power

## 실행 Slice 1: Watch 런닝 도메인 모델과 RED/GREEN 계약

### 범위

1. `android/wear/src/main/java/com/lifestreak/wear/workout/`
   - `WearWorkoutType`, `WearRunSession`, `HeartRateSample`, `WearRunSummary`, `WearWorkoutPayload` 데이터 모델을 만든다.
   - `런닝/조깅` payload는 `{ type: "running", source: "wear", dateKey, startedAt, endedAt, durationSec, distanceKm, avgPaceSecPerKm, avgHeartRateBpm, maxHeartRateBpm, samples10s }` 형태로 정규화한다.
   - malformed/partial payload는 저장 전 validation에서 거부한다.

2. `android/wear/src/test/`
   - payload serializer가 10초 단위 심박 샘플을 만들고, 평균/최고 심박/거리/페이스를 안정적으로 계산하는 JVM test를 추가한다.
   - RED: 모델/serializer가 없어 실패한다.
   - GREEN: 모델/serializer 구현 후 통과한다.

### 제외

- Watch UI, Health Services 실제 연동, Data Layer 송신은 아직 구현하지 않는다.

### 검증

- `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; .\android\gradlew.bat -p android :wear:testDebugUnitTest`
- evidence: `.omo/evidence/wear-cardio-running-poc/slice1-red-green.txt`

## 실행 Slice 2: Watch 운동 캐러셀과 런닝/조깅 POC UI

### 범위

1. `android/wear/src/main/res/layout/`
   - 기존 `page_workout.xml`을 “운동 캐러셀 진입”으로 전환하거나 별도 `page_workout_carousel.xml`, `page_run_active.xml`, `page_run_paused.xml`, `page_run_summary.xml`을 추가한다.
   - 사진 1: 중앙 원형 `런닝/조깅` 선택, 좌우에 비활성 운동 후보가 보이는 캐러셀.
   - 사진 3: active 화면은 시간, 거리 km, 페이스, 심박 bpm을 큰 숫자 위주로 표시하고 하단 pause control을 둔다.
   - 사진 4: pause 화면은 재개/최종종료를 원형 버튼으로 분리한다.

2. `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`
   - 기존 ViewPager page 수/indicator를 새 workout session 화면 상태와 충돌하지 않게 정리한다.
   - `런닝/조깅`만 start 가능, 나머지 캐러셀 후보는 disabled 상태와 “준비중” feedback만 제공한다.

3. UI 원칙
   - 원형 watch viewport에서 40mm/44mm 모두 텍스트 클리핑이 없어야 한다.
   - visible UI에 새 이모지를 추가하지 않는다. 아이콘은 vector drawable 또는 텍스트 심볼을 사용한다.

### 제외

- 실제 Health Services 센서값, 폰 저장은 다음 slice에서 연결한다.

### 검증

- `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; .\android\gradlew.bat -p android :wear:assembleDebug`
- Android Studio Wear emulator 또는 실제 Galaxy Watch에서:
  - 앱 실행 -> 운동 page -> `런닝/조깅` 선택 -> active 화면 -> pause -> resume -> final end summary.
- evidence: `.omo/evidence/wear-cardio-running-poc/slice2-watch-ui.png`, `.omo/evidence/wear-cardio-running-poc/slice2-action-log.txt`

## 실행 Slice 3: Health Services ExerciseClient 심박/거리 수집

### 범위

1. `android/wear/build.gradle`
   - `androidx.health:health-services-client` dependency를 추가한다.

2. `android/wear/src/main/AndroidManifest.xml`
   - `BODY_SENSORS`, `ACTIVITY_RECOGNITION`, foreground service permission/type을 추가한다.

3. `android/wear/src/main/java/com/lifestreak/wear/workout/`
   - `ExerciseClient`를 foreground service에서 소유한다.
   - running exercise 시작/일시정지/재개/종료 상태를 Health Services state와 동기화한다.
   - metric은 `HEART_RATE_BPM`, `DISTANCE_TOTAL`, `SPEED`, `ACTIVE_EXERCISE_DURATION`를 우선 사용한다.
   - 심박은 UI에는 최신값을 표시하되 저장 payload는 10초 bucket으로 정규화한다.
   - Health Services capability/permission이 없으면 심박 UI를 `-- bpm` 또는 “권한 필요”로 낮추고 운동 기록 자체는 가능하게 한다.

### 제외

- GPS route와 지도 polyline은 POC 범위에서 제외한다.
- Health Connect 쓰기는 하지 않는다. Tomato Farm 저장 경로가 우선이다.

### 검증

- `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; .\android\gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`
- Wear emulator synthetic Health Services data 또는 실제 Galaxy Watch:
  - BODY_SENSORS 권한 허용 -> 런닝 시작 -> 10초 이상 대기 -> bpm 표시 -> 종료 summary에 avg/max bpm 표시.
  - 권한 거부 -> bpm fallback 표시, 앱 crash 없음.
- evidence: `.omo/evidence/wear-cardio-running-poc/slice3-health-services-log.txt`, `.omo/evidence/wear-cardio-running-poc/slice3-watch-active-hr.png`

## 실행 Slice 4: Wear Data Layer -> 폰 앱 저장 bridge

### 범위

1. `android/wear`
   - 종료 버튼에서 `MessageClient` 또는 small `DataClient` item으로 final `WearWorkoutPayload`만 전송한다.
   - 운동 중에는 폰으로 rapid live update를 보내지 않는다. 필요 시 10초 draft는 local only로 유지한다.
   - 전송 성공/실패/대기 상태를 Watch summary에 표시한다.

2. `android/app`
   - `play-services-wearable` dependency를 추가한다.
   - `WearableListenerService` 또는 Data Layer listener를 추가해 `/tomato/workout/run/complete` payload를 받는다.
   - WebView가 살아 있으면 `evaluateJavascript()`로 JS bridge에 전달한다.
   - WebView가 없거나 로그인 전이면 `SharedPreferences` queue에 payload를 저장하고, `MainActivity` load 후 JS bridge로 drain한다.

3. root JS source
   - 새 `wear-bridge.js` 또는 기존 workout 모듈에 `window.__tomatoWearWorkoutBridge.save(payload)`를 둔다.
   - bridge는 payload를 검증하고, 해당 `dateKey`로 `loadWorkoutDate()` 후 `S.workout.exercises`에 cardio/running card entry를 추가한 뒤 `saveWorkoutDay({ silent: true })`를 호출한다.
   - 저장 완료 후 `showToast('워치 런닝 기록을 저장했어요', ...)`와 `sheet:saved`/캐러셀 focus 경로를 유지한다.
   - 기존 사진 필드와 식단 필드는 payload merge 경로에서 보존한다.

4. `sw.js`
   - root JS/source가 `STATIC_ASSETS`에 포함되면 `CACHE_VERSION`을 bump한다.

### 제외

- Watch가 Firestore REST/Android Firebase SDK로 직접 쓰는 경로는 추가하지 않는다.
- iOS paired watch/phone은 지원하지 않는다.

### 검증

- RED/GREEN JS:
  - `node --test tests/wear-workout-bridge.test.js`
  - malformed payload 거부, valid payload가 cardio card entry로 저장되는 계약, 기존 fields 보존 계약.
- Android:
  - `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; .\android\gradlew.bat -p android :app:assembleDebug :wear:assembleDebug`
- Data Layer:
  - 실제 watch/phone 또는 emulator pair에서 run complete -> phone app queue/bridge -> 그날 운동 카드 생성 확인.
  - `adb shell dumpsys activity service WearableService`로 과도한 MessageClient/DataClient 호출이 없는지 확인한다.
- evidence: `.omo/evidence/wear-cardio-running-poc/slice4-red-green.txt`, `.omo/evidence/wear-cardio-running-poc/slice4-data-layer-log.txt`, `.omo/evidence/wear-cardio-running-poc/slice4-phone-card.png`

## 실행 Slice 5: APK 산출, 회귀, 리뷰

### 범위

1. APK 산출
   - Phone APK: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Watch APK: `android/wear/build/outputs/apk/debug/wear-debug.apk`
   - 필요하면 app module에 `wearApp project(':wear')`를 연결해 phone APK/AAB packaging 정책을 명시한다. Debug 설치 검증은 두 APK를 각각 설치하는 경로로도 허용한다.

2. 정적/회귀
   - JS 변경이 있으면 `node --check` 대상 파일과 focused/full `node --test tests/*.test.js`.
   - `npm.cmd run verify:assets`.
   - Android Gradle assemble/test.

3. 실제 surface QA
   - Watch: 캐러셀 -> 런닝 시작 -> HR 표시 -> pause/resume -> final stop.
   - Phone: 저장된 그날 운동 카드가 유산소/런닝 카드로 추가되고 캐러셀에서 보인다.
   - Production Pages: root JS/source 변경이 있으면 `npm.cmd run deploy:production` 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`.

### 검증

- `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; npm.cmd run verify:assets`
- `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; node --test tests/*.test.js`
- `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; .\android\gradlew.bat -p android :wear:testDebugUnitTest :app:assembleDebug :wear:assembleDebug`
- if deployed: `cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

## 승인 후 첫 실행 slice

Slice 1부터 시작한다. 먼저 `WearWorkoutPayload` 모델과 JVM RED/GREEN test를 만들고, 앱 UI나 저장 경로는 건드리지 않는다. Slice 1이 통과한 뒤 Slice 2에서 Watch UI를 붙이고, Slice 3에서 Health Services, Slice 4에서 phone 저장 bridge를 연결한다.

## 실행 기록 - Slice 1

- 상태: `complete`
- 변경:
  1. `android/wear/build.gradle`에 Wear JVM test 의존성을 추가했다.
  2. `android/wear/src/main/java/com/lifestreak/wear/workout/WearRunPayload.kt`에 런닝 payload 모델/serializer를 추가했다.
  3. `android/wear/src/test/java/com/lifestreak/wear/workout/WearRunPayloadTest.kt`에 10초 심박 bucket, JSON 계약, malformed input rejection, 실제 calendar date 검증, payload 크기 상한 테스트를 추가했다.
- 검증:
  1. RED: 모델 미존재 상태에서 focused JVM test가 `Unresolved reference`로 실패했다.
  2. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest --tests com.lifestreak.wear.workout.WearRunPayloadTest`.
  3. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`.
  4. PASS: security hardening rerun `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`.
  5. evidence: `.omo/evidence/wear-cardio-running-poc/slice1-red-green.txt`.
- 제외 유지: Watch UI, Health Services, Data Layer, phone save bridge는 아직 구현하지 않았다.
- 리뷰: `docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice1-review.md`
- 리뷰 결과: PASS. 최초 보안 리뷰에서 지적한 payload 크기 상한과 실제 날짜 검증을 보강했고, 재리뷰 PASS를 받았다.

## 실행 기록 - Slice 2

- 상태: `complete`
- 변경:
  1. `page_workout.xml`에 유산소 캐러셀, `런닝/조깅` start, active/pause/summary 화면을 추가했다.
  2. `WearWorkoutUiController`와 `WearRunUiState`가 워치 UI 이벤트, tick, elapsed/distance/pace/HR 표시를 관리한다.
  3. 기존 오늘 운동 기록은 캐러셀 아래 compact list로 유지했다.
- 검증:
  1. PASS: `node --test tests/wear-slice2-artifacts.test.js`.
  2. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`.
  3. PASS: Wear AVD `TomatoWearSmallRound`에서 picker/active/paused/summary screenshots 캡처.
- 리뷰: `docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice2-review.md`
- 제외 유지: Health Services, Data Layer, phone save bridge는 아직 구현하지 않았다.

## 실행 기록 - Slice 3

- 상태: `complete`
- 변경:
  1. `android/wear/build.gradle`에 `androidx.health:health-services-client:1.0.0`와 `com.google.guava:guava:33.2.1-android`를 추가했다.
  2. `AndroidManifest.xml`에 `ACTIVITY_RECOGNITION`, `BODY_SENSORS`, `android.permission.health.READ_HEART_RATE`, foreground service permissions/type과 `.workout.WearExerciseService`를 추가했다.
  3. `WearExerciseService`가 foreground service로 Health Services `ExerciseClient`를 소유하고 running start/pause/resume/end를 처리한다.
  4. `WearExerciseSessionStore`가 Health Services metric update를 UI 컨트롤러에 전달한다.
  5. `WearExerciseMetricAccumulator`가 UI 최신값과 저장 payload용 10초 심박 bucket 샘플을 분리한다.
  6. `WearWorkoutUiController`가 start/pause/resume/final stop 버튼에서 service command를 호출하고 store metric을 `WearRunUiState`에 반영한다.
  7. `MainActivity`가 워치 운동 권한을 런타임 요청한다.
- 검증:
  1. RED: `node --test tests/wear-slice3-health-services.test.js`가 Health Services dependency/service 누락으로 실패했다.
  2. RED: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest`가 `WearExerciseMetricAccumulator` 미존재로 실패했다.
  3. PASS: `node --test tests/wear-slice3-health-services.test.js`.
  4. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`.
  5. PASS: Wear AVD `TomatoWearSmallRound` 최종 APK 설치, 권한 grant, 운동 page에서 `런닝/조깅` start 후 12초 대기, active 화면 `115 bpm`, foreground service `isForeground=true`, pause/final stop summary와 service cleanup 확인.
  6. LSP: Kotlin LSP가 설치되어 있지 않아 실행하지 못했다. Gradle compile/test/assemble로 대체 검증했다.
  7. cleanup: 운동 service 종료, `adb emu kill`, `adb devices` empty 확인.
- evidence:
  1. `.omo/evidence/wear-cardio-running-poc/slice3-red-node-test.txt`
  2. `.omo/evidence/wear-cardio-running-poc/slice3-red-gradle-test.txt`
  3. `.omo/evidence/wear-cardio-running-poc/slice3-green-node-test-after-speed.txt`
  4. `.omo/evidence/wear-cardio-running-poc/slice3-gradle-test-assemble-final.txt`
  5. `.omo/evidence/wear-cardio-running-poc/slice3-watch-active-hr-final.png`
  6. `.omo/evidence/wear-cardio-running-poc/slice3-final-runtime-active-adb.txt`
  7. `.omo/evidence/wear-cardio-running-poc/slice3-runtime-cleanup.txt`
  8. `.omo/evidence/wear-cardio-running-poc/slice3-emulator-cleanup.txt`
- 주의:
  1. AndroidX 문서의 `health-services-client:1.1.0-rc02`는 Kotlin 2.1 metadata로 현재 프로젝트 Kotlin 1.9.22와 맞지 않아 stable `1.0.0`을 사용했다.
  2. Slice 3은 watch local Health Services/UI 수집까지만 구현했다. 최종 종료 payload를 폰 앱에 저장하는 Data Layer bridge는 Slice 4 범위다.
- 리뷰: `docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice3-review.md`

## 실행 기록 - Slice 4

- 상태: `complete`
- 변경:
  1. `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutDataLayer.kt`를 추가해 final run payload를 `/tomato/workout/run/complete` message로 전송한다.
  2. `WearWorkoutUiController`가 final stop 시점에만 `WearWorkoutPayload`를 만들고 summary 화면에 전송 상태를 표시한다.
  3. `android/app`에 `TomatoWearWorkoutListenerService`와 `TomatoWearWorkoutBridge`를 추가해 Data Layer message를 SharedPreferences queue에 저장하고 WebView bridge로 drain한다.
  4. `workout/wear-bridge.js`를 추가해 `window.__tomatoWearWorkoutBridge.save(payload)`와 `saveFromNative(payload)`를 등록한다. bridge는 payload를 검증하고 `loadWorkoutDate()` 후 cardio/running entry를 upsert한 뒤 `saveWorkoutDay({ silent: true })`를 호출한다.
  5. `workout/save.js`와 `workout/sessions.js`가 `cardio.source === 'wear-running'` 엔트리를 실제 cardio entry로 보존한다.
  6. Wear OS Data Layer 공식 제약에 맞춰 phone/watch `applicationId`를 모두 `com.lifestreak.app`로 맞췄다. Kotlin namespace/package는 기존 `com.lifestreak.wear`를 유지한다.
  7. `sw.js` `STATIC_ASSETS`에 `./workout/wear-bridge.js`를 추가하고 `CACHE_VERSION`을 `tomatofarm-v20260707z16-lifezone-weight-motion`로 bump했다.
  8. `npm.cmd run cap:sync`로 root web source를 `www/`와 `android/app/src/main/assets/public`에 반영했다.
- 검증:
  1. RED: `node --test tests/wear-workout-bridge.test.js`가 native bridge/web bridge 파일 누락으로 실패했다.
  2. PASS: `node --test tests/wear-workout-bridge.test.js`.
  3. PASS: `node --test tests/wear-workout-bridge.test.js tests/wear-slice3-health-services.test.js tests/wear-slice2-artifacts.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js`.
  4. PASS: `node --check workout/wear-bridge.js && node --check workout/save.js && node --check workout/sessions.js && node --check workout/index.js`.
  5. PASS: `npm.cmd run cap:sync`.
  6. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug`.
  7. PASS: Android app asset sync 확인: `android/app/src/main/assets/public/workout/wear-bridge.js`에 `__tomatoWearWorkoutBridge`와 `wear-running` 포함.
  8. PASS: Wear AVD `TomatoWearSmallRound`에서 picker -> `런닝/조깅` -> active -> pause -> final stop summary를 실행했고, 현재 emulator pair에 reachable node가 없어 `폰 연결 대기` fallback이 표시되는 것을 확인했다.
  9. LSP: TypeScript/Kotlin LSP가 설치되어 있지 않아 실행하지 못했다. `node --check`, focused Node tests, Gradle compile/test/assemble로 대체했다.
- evidence:
  1. `.omo/evidence/wear-cardio-running-poc/slice4-red-node-test.txt`
  2. `.omo/evidence/wear-cardio-running-poc/slice4-green-node-test.txt`
  3. `.omo/evidence/wear-cardio-running-poc/slice4-cap-sync.txt`
  4. `.omo/evidence/wear-cardio-running-poc/slice4-post-sync-node.txt`
  5. `.omo/evidence/wear-cardio-running-poc/slice4-post-sync-gradle.txt`
  6. `.omo/evidence/wear-cardio-running-poc/slice4-watch-summary-fallback.png`
  7. `.omo/evidence/wear-cardio-running-poc/slice4-wearable-service-before.txt`
  8. `.omo/evidence/wear-cardio-running-poc/slice4-emulator-cleanup.txt`
- 주의:
  1. 현재 `BudgetNotifApi35` phone emulator에는 WearableService가 없고, `TomatoWearSmallRound` Wear emulator의 `dumpsys activity service WearableService`는 reachable node 0을 표시한다. 따라서 실제 phone card 생성 screenshot은 paired physical phone/watch 또는 Android Studio paired emulator에서 추가 검증해야 한다.
  2. 공식 Android 문서 기준 Wear Data Layer는 phone/watch package name과 signing signature가 모두 같아야 하므로, 이 checkout에서는 debug signing과 동일 `applicationId`가 전제다.
- 리뷰: `docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice4-review.md`

## 실행 기록 - Slice 5

- 상태: `local_complete_needs_paired_device_runtime_verification`
- 변경:
  1. Slice 5에서 새 앱 기능 코드는 추가하지 않고, APK 산출물과 전체 회귀 검증을 수행했다.
  2. `tests/pwa-update-auto-reload.test.js`의 `pwa-register.js` query assertion을 현재 `index.html` cache-bust 값에 맞게 갱신했다.
  3. `docs/ai/NEXT_ACTION.md`와 리뷰 문서를 Slice 5 결과 기준으로 갱신했다.
- 검증:
  1. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=895`.
  2. PASS: `node --test tests/*.test.js` - 727 pass.
  3. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug`.
  4. PASS: `git diff --check` - whitespace error 없음. LF/CRLF working copy warning만 표시됨.
  5. APK: `android/app/build/outputs/apk/debug/app-debug.apk` 45M, `android/wear/build/outputs/apk/debug/wear-debug.apk` 14M.
- evidence:
  1. `.omo/evidence/wear-cardio-running-poc/slice5-verify-assets.txt`
  2. `.omo/evidence/wear-cardio-running-poc/slice5-full-node-tests-rerun.txt`
  3. `.omo/evidence/wear-cardio-running-poc/slice5-gradle-final.txt`
  4. `.omo/evidence/wear-cardio-running-poc/slice5-apk-files.txt`
  5. `.omo/evidence/wear-cardio-running-poc/slice5-diff-check.txt`
- 주의:
  1. 현재 `BudgetNotifApi35`/`TomatoWearSmallRound` emulator pair는 Data Layer reachable node가 없어 phone card creation runtime screenshot은 아직 없다.
  2. 실제 저장 완료는 paired physical phone/watch 또는 Android Studio paired emulator에서 phone APK와 watch APK를 모두 설치한 뒤 검증해야 한다.
  3. root JS/source 변경이 있지만 현재 워크트리에 이전 작업 staged/unstaged 변경이 섞여 있어 production Pages deploy 커밋은 실행하지 않았다.
- 리뷰: `docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice5-review.md`

## 실행 Slice 6: 런닝 버튼/GPS 추적/저장 보정

### 트리거

사용자가 실제 Galaxy Watch 앱에서 달리기/운동 관련 기능이 보이지 않거나 버튼이 눌리지 않고, 가장 중요한 GPS 기반 런닝 기록 추적 및 운동 저장이 구현되지 않았다고 보고했다.

### 진단 기준

1. 현재 코드에는 `WearWorkoutUiController` 버튼 리스너가 있지만 실제 설치 APK/워치 surface에서 눌리는지 다시 증명해야 한다.
2. 현재 `WearExerciseService`는 `ExerciseConfig(isGpsEnabled = false)`로 시작하고 `DataType.LOCATION`을 요청하지 않는다. 따라서 “GPS 결과” 요구는 구현되지 않았다.
3. 현재 `WearWorkoutPayload`와 `workout/wear-bridge.js`는 심박/거리 요약만 저장하고 GPS route/result를 phone workout `runData.route`에 보존하지 않는다.

### 범위

1. Watch 런닝 시작/일시정지/재개/최종종료 버튼은 실제 Wear UI surface에서 tap으로 전환되어야 한다.
2. `android/wear` Health Services `ExerciseClient`는 `DataType.LOCATION`을 capability와 권한 조건에 맞춰 요청하고, running exercise에서 `isGpsEnabled = true`를 사용한다.
3. 위치 샘플은 배터리와 payload 크기를 고려해 저장용 route point로 제한한다. 최소 필드는 `timestampMs`, `lat`, `lng`, 선택 필드 `altitude`, `bearing`이다.
4. Watch final payload는 `route`와 `routeSummary`를 포함한다. `routeSummary`에는 `source: 'wear-gps'`, `pointCount`, `distanceKm`, `durationSec`, `startedAt`, `endedAt`를 넣는다.
5. Phone web bridge는 `route`를 검증/정규화해 `S.workout.runData.route`와 cardio entry `cardio.routeSummary`에 저장한다. Firestore는 기존 `saveWorkoutDay({ silent: true })` 경계를 그대로 사용한다.
6. GPS 권한이 없거나 location capability가 없으면 버튼/운동 자체는 동작하고, UI/summary는 `GPS 권한 필요` 또는 `GPS 대기` 상태를 표시한다.

### 제외

- 지도 polyline 렌더링의 신규 디자인은 이 slice에서 하지 않는다. 이미 저장된 route를 기존 phone running data 구조에 넣는 데 집중한다.
- Health Connect 쓰기, iOS pair, Samsung Health 직접 연동은 제외한다.
- unrelated cardio picker/style 변경은 건드리지 않는다.

### RED/GREEN 검증

1. RED: `node --test tests/wear-gps-running-contract.test.js`
   - 현재 `isGpsEnabled = false`, `DataType.LOCATION` 부재, route payload 부재, web bridge route 저장 부재로 실패해야 한다.
2. GREEN: 같은 테스트가 통과해야 한다.
3. Android: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :app:assembleDebug :wear:assembleDebug`
4. Surface QA:
   - `TomatoWearSmallRound` AVD 또는 실제 Watch에 APK 설치.
   - `adb shell input tap ...` 또는 UI automation으로 `런닝/조깅 -> 일시정지 -> 재개 -> 최종종료`를 실행.
   - evidence screenshot/log에 active/paused/summary 상태와 GPS status가 남아야 한다.
   - 실제 paired phone/watch가 없으면 Data Layer 저장 완료는 `not verified yet`으로 남기되, native/web bridge contract와 APK surface는 검증한다.

## 실행 기록 - Slice 6

- 상태: `local_complete_needs_paired_device_save_verification`
- 변경:
  1. `android/wear` manifest/runtime permission에 `ACCESS_FINE_LOCATION`과 foreground service location type을 추가했다.
  2. `WearExerciseService`가 위치 권한이 있을 때 `ExerciseConfig(isGpsEnabled = true)`로 시작하고 `DataType.LOCATION`을 요청한다.
  3. `WearExerciseMetricAccumulator`와 `WearExerciseSessionStore`가 10초 저장 흐름과 별도로 route point를 정규화해 snapshot에 보존한다.
  4. `WearRunPayload`가 `route`와 `routeSummary`를 포함하고, route가 있으면 거리 metric이 비어도 haversine fallback으로 `distanceKm`를 계산한다.
  5. `WearWorkoutUiController`와 `page_workout.xml`에 active/summary GPS 상태 표시를 추가했다.
  6. `workout/wear-bridge.js`가 watch route를 `S.workout.runData.route`, `runData.routeSummary`, cardio `routeSummary`로 저장한다.
  7. `sw.js` cache version과 Android web assets를 `npm.cmd run cap:sync`로 동기화했다.
- 검증:
  1. RED: `node --test tests/wear-gps-running-contract.test.js` - location permission/route 저장 누락으로 실패.
  2. PASS: `node --test tests/wear-gps-running-contract.test.js`.
  3. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest`.
  4. PASS: `node --test tests/wear-gps-running-contract.test.js tests/wear-slice3-health-services.test.js tests/wear-workout-bridge.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js`.
  5. PASS: `npm.cmd run cap:sync`.
  6. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug`.
  7. PASS: `node --test tests/*.test.js` - 731 pass.
  8. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=895`.
  9. PASS: `git diff --check` - whitespace error 없음. LF/CRLF working copy warning만 표시됨.
  10. PASS: Wear AVD `TomatoWearSmallRound`에서 vertical swipe로 운동 페이지 접근, `런닝/조깅` tap, active distance/heart rate/GPS, pause, final stop summary를 실제 터치로 확인했다. Summary: `0.18 km`, `01:19`, `145 bpm`, `GPS 7점`, `폰 연결 대기`.
- evidence:
  1. `.omo/evidence/wear-cardio-running-poc/slice6-red-gps-contract.txt`
  2. `.omo/evidence/wear-cardio-running-poc/slice6-green-gps-contract.txt`
  3. `.omo/evidence/wear-cardio-running-poc/slice6-gradle-final.txt`
  4. `.omo/evidence/wear-cardio-running-poc/slice6-full-node-rerun.txt`
  5. `.omo/evidence/wear-cardio-running-poc/slice6-verify-assets.txt`
  6. `.omo/evidence/wear-cardio-running-poc/slice6-watch-qa-log.md`
  7. `.omo/evidence/wear-cardio-running-poc/slice6-watch-picker.png`
  8. `.omo/evidence/wear-cardio-running-poc/slice6-watch-active.png`
  9. `.omo/evidence/wear-cardio-running-poc/slice6-watch-paused.png`
  10. `.omo/evidence/wear-cardio-running-poc/slice6-watch-summary.png`
- 주의:
  1. 실제 paired phone/watch가 없어 Data Layer 저장 완료와 phone workout card screenshot은 `not verified yet`이다. 현재 AVD에서는 watch summary가 정상적으로 `폰 연결 대기`를 표시했다.
  2. top-level Watch page 이동은 수평이 아니라 수직 swipe다.
  3. 현재 워크트리에 unrelated staged/unstaged 변경이 많아 production Pages deploy는 실행하지 않았다.
- 리뷰: `docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice6-review.md`

## 다음 세션 시작 프롬프트

Paired physical phone/watch 또는 Android Studio paired emulator를 준비한 뒤 phone APK와 watch APK를 모두 설치한다. 폰 앱 로그인 상태에서 워치 `운동 -> 런닝/조깅 -> 최종종료`를 실행하고, 토마토앱 해당 날짜 운동 카드/캐러셀에 watch running entry와 GPS route metadata가 저장되는지 screenshot evidence를 추가한다.
