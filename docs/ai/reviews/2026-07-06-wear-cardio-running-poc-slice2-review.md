# Galaxy Watch 유산소/런닝 POC Slice 2 리뷰

## 결론

- 상태: `PASS`
- 범위: Watch 운동 캐러셀과 `런닝/조깅` POC UI만 리뷰했다.
- 결과: Slice 2는 계획 범위 안에서 완료됐다. Health Services 실제 센서 연결, Wear Data Layer 송신, phone 저장 bridge는 구현하지 않았고 다음 slice로 남아 있다.

## 변경 파일

- `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearRunUiState.kt`
- `android/wear/src/test/java/com/lifestreak/wear/workout/WearRunUiStateTest.kt`
- `android/wear/src/main/res/layout/page_workout.xml`
- `android/wear/src/main/res/drawable/wear_cardio_circle_muted.xml`
- `android/wear/src/main/res/drawable/wear_cardio_circle_primary.xml`
- `android/wear/src/main/res/drawable/wear_cardio_circle_stop.xml`
- `android/wear/src/main/res/values/ids.xml`
- `tests/wear-slice2-artifacts.test.js`
- `.omo/evidence/wear-cardio-running-poc/*slice2*`

## 검증

1. RED:
   - `node --test tests/wear-slice2-ui.test.js`
   - 기존 Workout page에 `wearWorkoutPicker`, `bindWearWorkoutSession` 등 Slice 2 UI가 없어 실패했다.
2. GREEN:
   - `node --test tests/wear-slice2-artifacts.test.js`
   - PASS, 2 tests.
3. Gradle:
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`
   - PASS, `android/wear/build/outputs/apk/debug/wear-debug.apk` 생성.
4. Wear AVD 시각 QA:
   - `system-images;android-34;android-wear;x86_64` 설치 후 `TomatoWearSmallRound` AVD 생성.
   - `adb shell dumpsys battery unplug` 후 APK 설치/실행.
   - 캡처: `.omo/evidence/wear-cardio-running-poc/slice2-watch-ui.png`, `slice2-watch-ui-picker.png`, `slice2-watch-ui-active.png`, `slice2-watch-ui-paused.png`, `slice2-watch-ui-summary.png`.

## 리뷰 레인

- 목표/제약 리뷰: APPROVE.
- QA 리뷰: PASS.
- 코드 리뷰: PASS. reattach 시 active timer 재스케줄 blocker를 수정한 뒤 APPROVE.
- 보안/프라이버시 리뷰: PASS, severity NONE.
- 컨텍스트 리뷰: APPROVE.
- Visual QA: PASS. 384x384 round Wear AVD에서 CJK clipping/overlap blocker 없음.

## 남은 작업

1. Slice 3: Health Services `ExerciseClient` 기반 심박/거리 수집 연결.
2. Slice 4: Wear Data Layer -> phone app save bridge.
3. Slice 5: app/watch APK 산출, 회귀 검증, 최종 handoff.

## 주의

- `android/`는 `.gitignore` 대상이다. native 변경을 커밋해야 할 때는 `git add -f android/...`가 필요하다.
- Slice 2의 HR은 화면 필드만 있으며 값은 `-- bpm` placeholder다. 실제 심박/거리 값은 Slice 3에서 연결한다.
