# Galaxy Watch 유산소/런닝 POC Slice 6 리뷰

## 결론

- 상태: `PASS_LOCAL_WITH_PAIRED_DEVICE_SAVE_LIMITATION`
- 범위: 워치 런닝 버튼 surface 재검증, Health Services GPS location 수집, route payload 저장 계약, phone web bridge route 보존, APK/회귀 검증.
- 결과: Watch AVD에서 `런닝/조깅 -> 일시정지 -> 최종종료`가 실제 터치로 동작했고, summary에 거리/시간/심박/GPS point count가 표시됐다. 실제 paired phone/watch Data Layer 저장 완료와 토마토앱 카드 생성은 현재 reachable paired node가 없어 `not verified yet`이다.

## 변경 파일

- `android/wear/src/main/AndroidManifest.xml`
- `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseService.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulator.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearExerciseSessionStore.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearRunPayload.kt`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt`
- `android/wear/src/main/res/layout/page_workout.xml`
- `android/wear/src/test/java/com/lifestreak/wear/workout/WearExerciseMetricAccumulatorTest.kt`
- `android/wear/src/test/java/com/lifestreak/wear/workout/WearRunPayloadTest.kt`
- `workout/wear-bridge.js`
- `tests/wear-gps-running-contract.test.js`
- `tests/wear-slice3-health-services.test.js`
- `tests/pwa-update-auto-reload.test.js`
- `sw.js`
- `index.html`
- `build-info.json`
- generated `www/**` and `android/app/src/main/assets/public/**` from `npm.cmd run cap:sync`
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-07-06-wear-cardio-running-poc.md`
- `.omo/evidence/wear-cardio-running-poc/**`

## 검증

1. RED contract:
   - `node --test tests/wear-gps-running-contract.test.js`
   - FAIL before fix: missing `ACCESS_FINE_LOCATION`; web bridge route length `0 !== 2`.
2. GREEN contract:
   - `node --test tests/wear-gps-running-contract.test.js`
   - PASS: 2 tests, 2 pass.
3. Android unit:
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :wear:testDebugUnitTest`
   - PASS: `BUILD SUCCESSFUL`.
4. Final Android build/test:
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug`
   - PASS: `BUILD SUCCESSFUL`.
5. Full JS regression:
   - `node --test tests/*.test.js`
   - PASS: 731 tests, 731 pass, 0 fail.
6. Asset verification:
   - `npm.cmd run verify:assets`
   - PASS: `[runtime-assets] ok refs=895`.
7. Diff hygiene:
   - `git diff --check`
   - PASS: whitespace error 없음. LF/CRLF working copy warning만 표시됨.
8. Wear AVD manual QA:
   - PASS: `TomatoWearSmallRound`에서 vertical swipe로 운동 페이지 접근.
   - PASS: `런닝/조깅` tap -> active run.
   - PASS: active screen showed distance, heart rate, `GPS 1점+`.
   - PASS: pause -> paused screen, final stop -> summary.
   - PASS: summary showed `0.18 km`, `01:19`, `145 bpm`, `GPS 7점`, `폰 연결 대기`.

## 리뷰 결과

- Goal: 사용자가 지적한 “버튼이 안 눌림”은 최종 APK AVD에서 실제 tap으로 검증했다. top-level Watch page 이동은 수평이 아니라 수직 swipe가 필요했다.
- GPS: `ExerciseConfig`는 location permission이 있을 때 GPS를 켜고 `DataType.LOCATION`을 요청한다. route point는 timestamp/lat/lng/altitude/bearing으로 정규화한다.
- 저장 계약: Wear payload와 phone web bridge가 `route`와 `routeSummary`를 보존한다. phone 저장은 기존 workout save boundary를 유지한다.
- 성능/배터리: 심박은 기존 10초 bucket 경로를 유지하고, route는 저장 payload 상한을 둔다.
- 보안/프라이버시: location permission이 없으면 GPS 없이 운동은 계속 가능하며 UI에 권한/대기 상태를 표시한다.
- Production deploy: 현재 worktree에는 이전 staged/unstaged 변경이 섞여 있어 `origin/main` 배포 커밋은 실행하지 않았다.
- 남은 외부 검증: paired physical phone/watch 또는 Android Studio paired emulator에서 Data Layer message가 실제 phone app queue로 들어가고 해당 날짜 운동 카드/캐러셀에 저장되는지 확인해야 한다.

## 근거 파일

- `.omo/evidence/wear-cardio-running-poc/slice6-red-gps-contract.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-green-gps-contract.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-gradle-wear-test-1.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-focused-node-rerun.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-cap-sync.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-gradle-final.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-full-node-rerun.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-verify-assets.txt`
- `.omo/evidence/wear-cardio-running-poc/slice6-watch-qa-log.md`
- `.omo/evidence/wear-cardio-running-poc/slice6-watch-picker.png`
- `.omo/evidence/wear-cardio-running-poc/slice6-watch-active.png`
- `.omo/evidence/wear-cardio-running-poc/slice6-watch-paused.png`
- `.omo/evidence/wear-cardio-running-poc/slice6-watch-summary.png`

## 다음 작업

1. Paired physical phone/watch 또는 Android Studio paired emulator를 준비한다.
2. `adb -s <phone-device> install -r android/app/build/outputs/apk/debug/app-debug.apk`
3. `adb -s <watch-device> install -r android/wear/build/outputs/apk/debug/wear-debug.apk`
4. 폰 앱 로그인 상태에서 워치 `운동 -> 런닝/조깅 -> 최종종료`를 실행한다.
5. 폰 앱의 해당 날짜 운동 카드/캐러셀에 watch running entry와 GPS route metadata가 저장되는지 screenshot evidence를 추가한다.
