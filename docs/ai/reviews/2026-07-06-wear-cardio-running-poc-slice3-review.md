# Galaxy Watch 유산소/런닝 POC Slice 3 리뷰

## 결론

- 상태: `PASS`
- 범위: Health Services `ExerciseClient` 기반 심박/거리 수집과 워치 UI metric 반영만 리뷰한다.
- 결과: 로컬 구현/검증과 리뷰를 통과했다. Wear Data Layer 송신과 phone 저장 bridge는 Slice 4로 남아 있다.

## 변경 파일

- `android/wear/build.gradle`
- `android/wear/src/main/AndroidManifest.xml`
- `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulator.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseSessionStore.kt`
- `android/wear/src/test/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulatorTest.kt`
- `tests/wear-slice3-health-services.test.js`
- `.omo/evidence/wear-cardio-running-poc/*slice3*`

## 검증

1. RED:
   - `node --test tests/wear-slice3-health-services.test.js`
   - Health Services dependency/service/permissions가 없어 실패했다.
2. RED:
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest`
   - `WearExerciseMetricAccumulator` 미존재로 실패했다.
3. GREEN:
   - `node --test tests/wear-slice3-health-services.test.js`
   - PASS, 2 tests.
4. Gradle:
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`
   - PASS, `android/wear/build/outputs/apk/debug/wear-debug.apk` 생성.
5. Wear AVD runtime:
   - `TomatoWearSmallRound` AVD에 최종 APK 설치.
   - 권한 grant 후 운동 page -> `런닝/조깅` start -> 12초 대기.
   - active 화면에서 `115 bpm`과 거리/페이스 표시 확인.
   - `dumpsys activity services`에서 `WearExerciseService isForeground=true foregroundId=2001 types=00000100` 확인.
   - pause/final stop 후 summary와 service cleanup 확인.
6. Cleanup:
   - 운동 service 종료 확인.
   - `adb emu kill` 후 `adb devices` empty 확인.
7. Review sanity:
   - `git diff --check -- android/wear/build.gradle android/wear/src/main/AndroidManifest.xml android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulator.kt android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseSessionStore.kt android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt android/wear/src/test/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulatorTest.kt tests/wear-slice3-health-services.test.js docs/ai/NEXT_ACTION.md docs/ai/features/2026-07-06-wear-cardio-running-poc.md docs/ai/reviews/2026-07-06-wear-cardio-running-poc-slice3-review.md`
   - PASS.
   - `node --test tests/wear-slice3-health-services.test.js`
   - PASS, 2 tests.

## 리뷰 결과

- Health Services lifecycle: `WearExerciseService`가 foreground service에서 `ExerciseClient`를 소유하고 finish/cleanup에서 callback과 foreground 상태를 정리한다.
- 권한/프라이버시: 런타임 권한 요청은 activity recognition/body sensors 중심이고, Android 16 이상 granular heart rate permission도 선언/요청한다. 실시간 전송은 하지 않고 10초 HR bucket만 세션 payload 후보에 남긴다.
- UI 경계: Slice 3은 Watch UI metric 반영까지만 처리한다. 폰 저장, Data Layer 송신, Firebase/Data 경계는 Slice 4로 남겨 Firestore 직접 접근을 추가하지 않았다.
- 검증 한계: Kotlin LSP가 설치되어 있지 않아 언어 서버 diagnostics는 실행하지 못했다. 대신 Gradle unit test와 assemble, Wear AVD runtime으로 확인했다.

## 근거 파일

- `.omo/evidence/wear-cardio-running-poc/slice3-red-node-test.txt`
- `.omo/evidence/wear-cardio-running-poc/slice3-red-gradle-test.txt`
- `.omo/evidence/wear-cardio-running-poc/slice3-green-node-test-after-speed.txt`
- `.omo/evidence/wear-cardio-running-poc/slice3-gradle-test-assemble-final.txt`
- `.omo/evidence/wear-cardio-running-poc/slice3-watch-active-hr-final.png`
- `.omo/evidence/wear-cardio-running-poc/slice3-final-runtime-active-adb.txt`
- `.omo/evidence/wear-cardio-running-poc/slice3-runtime-cleanup.txt`
- `.omo/evidence/wear-cardio-running-poc/slice3-emulator-cleanup.txt`

## 남은 작업

1. Slice 4: final stop payload를 Wear Data Layer로 phone app에 전달한다.
2. Slice 4: phone app은 기존 `data.js`/`saveWorkoutDay()` 경계에서 그날 운동 카드/캐러셀에 저장한다.
3. Slice 5: APK 산출, 회귀 검증, 최종 handoff.

## 주의

- `android/`는 `.gitignore` 대상이다. native 변경을 커밋해야 할 때는 `git add -f android/...`가 필요하다.
- `health-services-client:1.1.0-rc02`는 Kotlin 2.1 metadata로 현재 Kotlin 1.9.22와 맞지 않아 AndroidX stable `1.0.0`을 사용했다.
- Slice 3은 Health Services 수집/UI 반영까지만 구현했다. 폰 저장은 아직 구현하지 않았다.
