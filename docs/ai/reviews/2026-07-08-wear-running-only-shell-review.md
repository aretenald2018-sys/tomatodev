# 갤럭시워치 러닝 전용 셸 리뷰

## 결론

리뷰 결과: **FAIL**

로컬 구현과 화면 증거는 요청한 러닝 전용 셸 방향을 대체로 만족한다. 다만 실제 워치 소스가 `.gitignore`의 `android/` 규칙에 걸려 git 추적 대상이 아니며, 계획에서 완료 조건으로 둔 paired phone/watch 저장 QA가 아직 `not verified yet` 상태라 완료 승인할 수 없다.

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-08-wear-running-only-shell.md`
- 신규 테스트: `tests/wear-running-only-shell.test.js`
- 갱신 테스트: `tests/wear-slice2-artifacts.test.js`
- 로컬 워치 소스: `android/wear/src/main/res/layout/activity_main.xml`, `android/wear/src/main/res/layout/page_workout.xml`, `android/wear/src/main/java/com/lifestreak/wear/MainActivity.kt`, `android/wear/src/main/java/com/lifestreak/wear/workout/WearWorkoutUiController.kt`, `android/wear/src/main/java/com/lifestreak/wear/workout/WearRunUiState.kt`, `android/wear/build.gradle`
- 증거: `.omo/evidence/wear-running-only-shell-20260708/`

## 확인한 것

1. PASS: `activity_main.xml`은 `page_workout.xml` 단일 include로 축소되어 있고 `ViewPager2`/6-dot indicator가 없다.
2. PASS: `page_workout.xml`은 ready/active/paused/summary 러닝 상태와 `runActiveElapsed`, `runActiveDistance`, `runActiveHeartRate`를 가진다.
3. PASS: `MainActivity.kt`는 `WearWorkoutUiController.bind()`만 연결하고 old dashboard/Firebase helper/timer/stocks 코드를 포함하지 않는다.
4. PASS: `WearWorkoutUiController.kt`는 `WearExerciseService.startRun/pauseRun/resumeRun/endRun`과 `WearWorkoutDataLayer.sendRunComplete()` 경로를 유지한다.
5. PASS: 화면 증거 `watch-ready.png`, `watch-active.png`, `watch-permission-fallback.png`, `watch-summary.png`는 러닝 전용 UI와 시간/거리/심박 동시 표시를 뒷받침한다.

## 차단 이슈

1. BLOCKER: 워치 앱 소스 변경이 git에 포함되지 않는다.
   - 증거: `git status --short --ignored=matching android/wear` 결과가 `!! android/wear/`이고, `git check-ignore -v android/wear/src/main/res/layout/activity_main.xml`은 `.gitignore:15:android/`를 반환한다.
   - 영향: 현재 러닝 전용 셸 구현은 로컬 ignored 파일에만 존재할 수 있어 새 세션, 커밋, PR, 배포에서 재현되지 않는다. `git diff --check`와 일반 diff도 실제 Kotlin/XML 변경을 검토하지 못한다.
   - 필요 조치: `android/wear` 소스를 추적 가능한 경로로 만들거나 `.gitignore` 예외/force-add 정책을 명확히 한 뒤, 이번 변경의 Kotlin/XML/Gradle/리소스 파일을 리뷰 가능한 diff에 포함한다.

2. BLOCKER: paired phone/watch 저장 완료 QA가 아직 미검증이다.
   - 증거: 계획 `docs/ai/features/2026-07-08-wear-running-only-shell.md`는 paired 환경이 없으면 이 항목을 `not verified yet`으로 남기고 완료 처리하지 말라고 적고, `phone-save-log.txt`도 `not verified yet`이다.
   - 영향: 핵심 요구 중 "러닝 결과 저장 기능과만 연동"의 실제 on-device 저장 경계가 정적 테스트로만 확인됐다.
   - 필요 조치: paired phone/watch 또는 paired emulator 환경에서 final stop 후 phone Tomato Farm 운동 카드/캐러셀에 `wear-running` cardio entry가 저장되는지 확인하고 `phone-card.png`, Data Layer 로그, phone save 로그를 남긴다.

## 검증

- PASS: `node --test tests/wear-running-only-shell.test.js tests/wear-slice2-artifacts.test.js tests/wear-workout-bridge.test.js tests/wear-slice3-health-services.test.js tests/wear-gps-running-contract.test.js tests/running-entry.test.js tests/workout-save-mode-guard.test.js` - 30 tests, 30 pass.
- PASS: `git diff --check`.
- PASS evidence 확인: `gradle-wear-app.txt`는 `BUILD SUCCESSFUL in 3s`, `watch-action-log.md`는 Wear emulator happy path와 permission fallback PASS를 기록한다.
- not verified yet: paired phone/watch Data Layer 저장 완료와 phone WebView `saveWorkoutDay({ silent: true })` 실제 호출.

## 다음 액션

1. `android/wear` 소스가 git diff에 잡히도록 추적 정책을 바로잡고 변경 파일을 명시한다.
2. paired phone/watch 저장 QA를 실제 기기/paired emulator에서 수행한다.
3. 위 두 항목이 끝나면 리뷰를 재실행하고 이 문서를 PASS/FAIL 기준으로 갱신한다.
