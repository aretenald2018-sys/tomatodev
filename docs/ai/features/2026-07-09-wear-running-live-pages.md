# 갤럭시워치 러닝 실시간 페이지 계획

## 요청

첨부 사진처럼 갤럭시워치에서 러닝 중 화면을 넘기면 실시간으로 요약, 페이스, 심박수, 심박수 구간, 경로 화면이 보여야 한다. 현재 Tomato Farm 웨어 앱에 구현되지 않은 부분을 구현한다.

## 그릴 결과

- 핵심 질문: 기존 `갤럭시워치 러닝 전용 셸`의 단일 active 화면을 유지할지, 사진처럼 active 러닝 중 넘기는 상세 페이지를 추가할지?
- 결정: 기존 6-page 대시보드는 되살리지 않고, 러닝 active 상태 안에만 5-page metric carousel을 추가한다.
- 추천 기본값: `ViewPager2`를 웨어 active 화면 내부에만 재도입한다. 기존 `page_streak/page_checkin/page_week/page_stocks/page_timer` 대시보드, 우측 6-dot indicator, Firestore dashboard 읽기는 계속 금지한다.
- 남은 가정: 실제 Galaxy Watch 또는 Wear emulator가 있어야 swipe/round viewport/Health Services 실시간 갱신을 최종 확인할 수 있다. paired phone 저장 QA는 기존 `wear-running-only-shell`의 미검증 항목으로 별도 유지한다.

## 첨부 사진 분석

1. Photo 1 요약 화면
   - 검은 원형 화면에 거리, 경과시간, 평균 페이스, 칼로리를 큰 색상 숫자로 세로 표시한다.
   - 사진 기준 색상 역할: 거리 yellow, 시간 blue, 페이스 mint, kcal pink.
   - 러닝 아이콘은 이모지가 아니라 단순 벡터/텍스트 glyph로 처리한다.

2. Photo 2 페이스 화면
   - 제목은 `페이스`.
   - 평균 페이스와 최고 페이스를 표시한다.
   - 하단에는 최근 페이스 추이를 cyan/teal bar chart로 보여준다.

3. Photo 3 심박수 화면
   - 제목은 `심박수`.
   - 평균 bpm과 최대 bpm을 표시한다.
   - 하단에는 orange line chart를 보여준다.

4. Photo 4 심박수 구간 화면
   - 제목은 `심박수 구간`.
   - zone 5-1 row와 각 zone별 체류 시간을 보여준다.
   - bar 색상은 red/orange/yellow 계열로 구간 강도를 표현한다.

5. Photo 5 경로 화면
   - 검은 지도 surface 위에 green route polyline을 표시한다.
   - 시작/현재 또는 시작/도착 marker를 표시한다.
   - 외부 map tile 의존성은 추가하지 않는다. `routePoints`를 bounding box로 정규화해 원형 화면 안에 polyline으로 그린다.

## 현재 코드 관찰

1. `android/wear/src/main/res/layout/activity_main.xml`은 `page_workout.xml` 단일 include만 가진다.
2. `page_workout.xml`은 `runReadyScreen`, `runActiveScreen`, `runPausedScreen`, `runSummaryScreen`만 있고 active 화면은 시간/거리/페이스/심박/GPS 상태를 한 화면에 표시한다.
3. `WearWorkoutUiController.bindExerciseStore()`는 `WearExerciseSessionSnapshot`에서 거리와 최신 심박만 `WearRunUiState`로 넘긴다.
4. `WearExerciseSessionSnapshot`에는 이미 `heartRateSamples`와 `routePoints`가 있다.
5. `WearExerciseMetricAccumulator`는 심박과 경로를 10초 bucket으로 축적한다.
6. `WearRunPayload`는 저장 payload에 평균 페이스, 평균/최대 심박, `samples10s`, `route`를 이미 포함한다.
7. `android/wear/build.gradle`은 이전 정리에서 `ViewPager2`/`RecyclerView` dependency를 제거했다.
8. `tests/wear-running-only-shell.test.js`는 현재 `ViewPager2`가 전혀 없다는 계약을 갖고 있으므로, 새 요구에 맞춰 old 6-page dashboard 금지는 유지하되 active metric pager는 허용하도록 갱신해야 한다.

## 실행 Slice 1: 러닝 active 실시간 페이지 carousel

### 범위

1. `android/wear/build.gradle`
   - `androidx.viewpager2:viewpager2`를 active metric pager 용도로 재추가한다.
   - dependency 재추가는 기존 6-page dashboard 부활이 아니라 `runMetricPager` 전용임을 테스트로 고정한다.

2. `android/wear/src/main/res/layout/page_workout.xml`
   - `runActiveScreen` 내부의 단일 metric block을 `runMetricPager`와 compact pause control로 바꾼다.
   - pager는 active 상태에서만 보인다.
   - ready/paused/summary workflow는 유지한다.

3. 새 layout 리소스
   - `wear_run_page_summary.xml`: 거리, 시간, 평균 페이스, kcal.
   - `wear_run_page_pace.xml`: 평균/최고 페이스, pace bar chart.
   - `wear_run_page_heart.xml`: 평균/최대 심박, heart line chart.
   - `wear_run_page_heart_zones.xml`: zone 5-1 bars/time.
   - `wear_run_page_route.xml`: route polyline canvas와 GPS fallback label.

4. 새/갱신 Kotlin UI 코드
   - `WearRunUiState.kt`에 live page snapshot을 추가한다.
   - `WearWorkoutUiController.kt`는 `WearExerciseSessionSnapshot`의 `heartRateSamples`, `routePoints`, `activeDurationMs`까지 상태에 반영한다.
   - `WearRunMetricPagerAdapter.kt`를 추가해 5개 page view를 bind한다.
   - `WearRunGraphViews.kt` 같은 작은 custom view를 추가해 bar/line/zone/route를 직접 그린다.
   - `ViewPager2` current page는 실시간 render에도 보존한다.

5. 파생 metric
   - 평균 페이스: 현재 `durationMs / distanceKm`.
   - 최고 페이스: distance delta가 있는 구간 중 가장 빠른 pace. 샘플 부족 시 `--`.
   - 페이스 추이: route/distance update 간격이 부족하면 전체 평균 1개 bar 또는 대기 상태.
   - 평균/최대 심박: `heartRateSamples` 기준. 샘플 없으면 `-- bpm`.
   - 심박 zone: 기본 zone을 bpm 범위로 계산한다. 예: z1 `<120`, z2 `120-139`, z3 `140-159`, z4 `160-179`, z5 `>=180`. 추후 사용자 HR max profile이 생기면 교체 가능하게 helper로 분리한다.
   - kcal: `calc.js`의 running MET 기본값과 같은 원리로 `weight=70kg` 기본 추정값을 live display 전용으로 계산한다. 저장 payload schema는 이번 slice에서 확장하지 않는다.

6. 테스트
   - `tests/wear-running-live-pages.test.js`를 RED로 추가한다.
   - `tests/wear-running-only-shell.test.js`와 `tests/wear-slice2-artifacts.test.js`를 새 계약으로 갱신한다.
   - `WearRunUiStateTest.kt`에 평균/최대 심박, zone 체류, kcal, route point 반영, invalid sample rejection을 추가한다.

### 반드시 없어야 하는 것

- old 6-page dashboard root pager.
- `page_streak`, `page_checkin`, `page_week`, `page_stocks`, `page_timer` runtime 참조.
- Watch module의 Firestore 직접 읽기/쓰기.
- 외부 map SDK 또는 map tile 네트워크 의존성.
- 앱 root `www/` 직접 수정.
- root `STATIC_ASSETS` 수정 없이 `sw.js`를 의미 없이 bump하는 변경.

### 반드시 남아야 하는 것

- 워치 첫 화면은 러닝 start 전용.
- 러닝 start/pause/resume/final stop/summary workflow.
- `WearExerciseService` Health Services metric 수집.
- final stop의 `/tomato/workout/run/complete` Data Layer 저장 전송.
- 심박/GPS 권한이 없어도 crash 없이 `-- bpm`, `GPS 대기/권한 필요` fallback.
- active 화면에서 한 페이지를 넘기고 있어도 시간/거리/심박 등 값이 실시간 갱신된다.

## 검증 계획

1. RED
   - `node --test tests/wear-running-live-pages.test.js`가 구현 전 실패해야 한다.
   - 실패 조건: `runMetricPager`, 5개 page layout, graph/route view 계약, live sample 파생 helper가 없으면 실패한다.

2. GREEN 정적/단위
   - `node --test tests/wear-running-live-pages.test.js tests/wear-running-only-shell.test.js tests/wear-slice2-artifacts.test.js`
   - `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" .\android\gradlew.bat -p android :wear:testDebugUnitTest :wear:assembleDebug`
   - `git diff --check`

3. Wear surface QA
   - Watch APK 설치 후 실행.
   - `시작` 탭 후 active 상태에서 좌우/상하 swipe로 5개 페이지를 넘긴다.
   - 기대:
     1. summary page에 거리/시간/페이스/kcal이 실시간 갱신된다.
     2. pace page에 평균/최고 페이스와 bar graph가 보인다.
     3. heart page에 평균/최대 심박과 line graph가 보인다.
     4. heart zones page에 zone 5-1 bars/time이 보인다.
     5. route page에 GPS route polyline 또는 명확한 GPS 대기 fallback이 보인다.
   - evidence: `.omo/evidence/wear-running-live-pages-20260709/watch-live-summary.png`, `watch-live-pace.png`, `watch-live-heart.png`, `watch-live-zones.png`, `watch-live-route.png`, `watch-live-action-log.md`.

4. paired phone/watch 저장 QA
   - 이 slice는 저장 payload schema를 바꾸지 않지만, 기존 저장 경계를 보존했는지 회귀 확인한다.
   - phone APK와 watch APK가 모두 설치/로그인된 상태에서 워치 러닝 `시작 -> 최종종료` 후 phone 운동 탭 `러닝` 카드에 `wear-running` cardio entry가 저장되는지 확인한다.
   - 환경이 없으면 `not verified yet`으로 남기고 blocker를 기록한다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-09-wear-running-live-pages.md`를 읽고 `실행 Slice 1`만 구현한다. 앱 코드 변경 전 `tests/wear-running-live-pages.test.js`를 RED로 추가하고, 기존 6-page dashboard를 되살리지 않는 조건을 유지하면서 active 러닝 중 5개 실시간 metric page carousel을 구현한다.
