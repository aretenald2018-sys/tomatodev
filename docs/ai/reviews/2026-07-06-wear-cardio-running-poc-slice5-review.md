# Galaxy Watch 유산소/런닝 POC Slice 5 리뷰

## 결론

- 상태: `PASS_LOCAL_WITH_PAIRED_DEVICE_RUNTIME_LIMITATION`
- 범위: 최종 APK 산출, full regression, asset verification, Android assemble/test, evidence 정리.
- 결과: Phone/Watch APK 산출과 로컬 회귀 검증은 통과했다. 현재 emulator pair는 Wear Data Layer reachable node가 없어 실제 phone workout card 생성은 paired physical device 또는 paired emulator에서 추가 검증해야 한다.

## 변경 파일

- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-07-06-wear-cardio-running-poc.md`
- `docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice5-review.md`
- `tests/pwa-update-auto-reload.test.js`
- Slice 4 구현 파일은 그대로 최종 검증 대상에 포함했다:
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
  - generated `android/app/src/main/assets/public/**` from `npm.cmd run cap:sync`

## 검증

1. Asset verification:
   - `npm.cmd run verify:assets`
   - PASS: `[runtime-assets] ok refs=895`
2. Full JS regression:
   - `node --test tests/*.test.js`
   - PASS: 727 tests, 727 pass, 0 fail
3. Android final build/test:
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug`
   - PASS: `BUILD SUCCESSFUL`
4. APK output:
   - `android/app/build/outputs/apk/debug/app-debug.apk` - 45M
   - `android/wear/build/outputs/apk/debug/wear-debug.apk` - 14M
5. Diff hygiene:
   - `git diff --check`
   - PASS: whitespace error 없음. LF/CRLF working copy warning만 표시됨.

## 리뷰 결과

- APK: phone app과 watch app 모두 debug APK가 생성됐다.
- Data contract: full JS regression에 `wear-workout-bridge` 동적 저장 테스트가 포함되어 malformed payload reject, valid payload save, duplicate upsert, existing diet field preservation을 확인했다.
- Android contract: Gradle final build가 phone listener/bridge와 wear sender/controller를 컴파일하고 watch unit tests를 통과했다.
- Runtime: Slice 4에서 Watch AVD `picker -> 런닝/조깅 -> active -> pause -> final stop`까지 실행했고, 현재 emulator pair의 reachable node 0 조건에서 `폰 연결 대기` fallback을 확인했다.
- Production deploy: root JS/source 변경이 있으나 현재 워크트리에 이전 작업 staged/unstaged 변경이 섞여 있어 `origin/main` 배포 커밋은 실행하지 않았다. 이 상태에서 임의 배포하면 unrelated 변경을 포함할 위험이 있다.
- 남은 외부 검증: paired physical phone/watch 또는 Android Studio paired emulator에서 Data Layer message 수신 후 phone app day workout card 생성 screenshot을 추가해야 한다.

## 근거 파일

- `.omo/evidence/wear-cardio-running-poc/slice5-verify-assets.txt`
- `.omo/evidence/wear-cardio-running-poc/slice5-full-node-tests-rerun.txt`
- `.omo/evidence/wear-cardio-running-poc/slice5-gradle-final.txt`
- `.omo/evidence/wear-cardio-running-poc/slice5-apk-files.txt`
- `.omo/evidence/wear-cardio-running-poc/slice5-diff-check.txt`
- `.omo/evidence/wear-cardio-running-poc/slice4-watch-summary-fallback.png`
- `.omo/evidence/wear-cardio-running-poc/slice4-wearable-service-before.txt`

## 다음 작업

1. Paired physical phone/watch 또는 Android Studio paired emulator를 준비한다.
2. `adb -s <phone-device> install -r android/app/build/outputs/apk/debug/app-debug.apk`
3. `adb -s <watch-device> install -r android/wear/build/outputs/apk/debug/wear-debug.apk`
4. 폰 앱 로그인 상태에서 워치 `운동 -> 런닝/조깅 -> 일시정지 -> 최종종료`를 실행한다.
5. 폰 앱의 해당 날짜 운동 카드/캐러셀에 watch running entry가 저장되는지 확인하고 screenshot evidence를 추가한다.
