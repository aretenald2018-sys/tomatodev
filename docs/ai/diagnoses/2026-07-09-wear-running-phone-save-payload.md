# Wear 러닝 폰 저장 payload 오류 진단

## 증상

- 갤럭시워치 러닝 종료 후 워치 summary에 `폰 저장 payload 오류`가 표시된다.
- 사용자는 워치 기록이 Tomato Farm 운동 탭의 `러닝` 기록으로 저장되지 않는다고 보고했다.
- 추가 질문: PWA에서는 저장이 안 되고 phone APK를 깔아야만 하는지 확인 필요.

## 결론

1. `폰 저장 payload 오류`는 phone/PWA 저장 단계가 아니라 워치 앱 내부 `WearRunSession.toPayload()` 생성 실패에서 표시된다.
2. 기존 `WearWorkoutUiController.syncRunSummary()`는 Health Services `activeDurationMs`가 1초 미만이어도 그대로 사용했다. 이 경우 `WearRunPayload`에서 `durationSec = 0`이 되어 `durationSec must be positive` 검증에 실패할 수 있다.
3. PWA 브라우저 단독 실행은 Wear OS Data Layer message를 직접 받을 수 없다. 워치에서 보낸 `/tomato/workout/run/complete`는 Android phone APK의 `TomatoWearWorkoutListenerService`와 `TomatoWearWorkoutBridge`가 받아 WebView의 `workout/wear-bridge.js`로 넘긴다. 따라서 워치 기록을 폰 Tomato Farm에 저장하려면 phone Android APK가 설치되어 있고 앱/WebView가 로그인 상태로 열릴 수 있어야 한다.
4. 기존 `.gitignore`가 Wear 러닝 저장 관련 Kotlin/XML/Gradle/test 파일과 phone native workout bridge 파일을 숨겨 리뷰/커밋 대상에서 빠지는 문제가 있었다.

## 수정

- `WearWorkoutUiController.kt`
  - `buildWearRunSessionForSummary()`를 추가했다.
  - 종료 payload의 duration은 `maxOf(exerciseSnapshot.activeDurationMs, uiSnapshot.durationMs, 1_000L)`로 계산해 1초 미만 underflow를 막는다.
  - payload 생성 실패는 `TomatoWearRun` logcat tag로 남긴다.
- `WearRunUiStateTest.kt`
  - Health Services duration이 450ms, UI duration이 300ms인 경우에도 payload `durationSec`가 1초로 생성되는 회귀 테스트를 추가했다.
- `.gitignore`
  - phone workout bridge, Wear source/layout/test/build.gradle의 정확한 예외를 추가해 핵심 파일이 git diff에 보이게 했다.
- `tests/wear-running-only-shell.test.js`
  - 핵심 Wear 저장 파일이 `git check-ignore`에 걸리지 않아야 한다는 회귀 테스트와 payload duration underflow 정적 계약을 추가했다.
- `tests/wear-app-refresh-update.test.js`
  - 새 tracking policy에 맞춰 `page_workout.xml`, phone workout bridge, Wear controller가 숨지 않는지 확인하도록 갱신했다.

## 검증

1. PASS RED: `node --test tests/wear-running-only-shell.test.js`가 수정 전 ignored 파일 목록 때문에 실패했다.
2. PASS GREEN: `node --test tests/wear-running-only-shell.test.js` - 5 tests, 5 pass.
3. PASS: `node --test tests/wear-running-only-shell.test.js tests/wear-workout-bridge.test.js tests/wear-slice3-health-services.test.js tests/wear-gps-running-contract.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js tests/wear-app-refresh-update.test.js` - 33 tests, 33 pass.
4. PASS: `git diff --check` exited 0 with existing CRLF warnings only.
5. not verified yet: project rule상 sandbox에서 Gradle build/dev server verification을 완료로 주장하지 않는다.
6. not verified yet: ADB 기본 SDK 경로 확인 결과 watch는 `192.168.0.106:46473 offline`이고 reconnect가 `10060` timeout으로 실패했다. 실제 Galaxy Watch 저장 flow는 재페어링 후 다시 검증해야 한다.

## 다음 검증 명령

```powershell
npm.cmd run install:wear-watch
```

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\android\gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug :app:assembleDebug
```

phone 저장 end-to-end 검증은 phone APK도 설치/실행/로그인된 상태에서 워치 러닝 `시작 -> 최종종료`를 수행하고, 폰 앱 운동 탭 해당 날짜의 `러닝` 카드에 `wear-running` cardio entry가 생기는지 확인한다.
