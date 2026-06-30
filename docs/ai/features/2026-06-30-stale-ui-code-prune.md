# 화면 미구현 stale 코드 제거 계획

## 상태

- 상태: `reviewed_no_findings`
- 작성일: 2026-06-30
- 요청: 화면에 구현되어 실질적인 UI 변화나 동작 변화를 일으키는 코드만 남기고, 화면에 구현되지 않는 stale 관련 코드는 제거한다.
- 자동 트리거: 리팩토링/모호한 정리 요청이므로 `/grill-me`를 적용했다.

## 그릴 결과

- 핵심 질문: `stale` 문자열이 들어간 모든 코드를 삭제할지, 실제 화면/동작에 연결되지 않은 stale 잔재만 삭제할지?
- 코드 탐색으로 결정: 모든 `stale`, `legacy` 문자열 삭제는 위험하다. 체중 미입력 stale 강조, AI 응답 stale token, 저장 중 날짜 변경 stale guard, legacy 데이터 canonical migration은 현재 UI 오동작/데이터 손실을 막는 실질 동작이다.
- 실행 기준: 현재 DOM/이벤트/route에서 더 이상 노출되지 않는 호환 전역, route 잔재, CSS/DOM 예외, unused style block부터 삭제한다.
- 남은 가정: 삭제 후보는 `rg` 역참조와 테스트로 검증한다. 외부 캐시 HTML 호환만을 위한 코드는 현재 화면 구현이 아니므로 삭제 대상이다.

## 탐색 결과

### 삭제 후보

1. `app.js`의 `openWorkoutRecordFromCalendar()`와 `window.wtOpenWorkoutRecord`
   - 현재 `render-calendar.js`와 운동 하단 시트 경로는 더 이상 `wtOpenWorkoutRecord`를 호출하지 않는다.
   - 내부 `openWorkoutTab()`은 같은 동작을 `openWorkoutDaySheetFromAction()`으로 직접 호출할 수 있다.

2. `app.js`/`render-stats.js`의 `setPeriod`
   - `render-stats.js`의 `setPeriod()`는 stale cached HTML 호환용으로만 남아 있고 현재 DOM 참조가 없다.
   - `window.setPeriod` lazy export도 같은 이유로 삭제한다.

3. `workout/load.js`의 `.wt-record-back-btn` disabled 예외
   - 운동 record back button DOM은 이미 제거됐다.

4. `style.css`의 운동 탭 날짜 row 잔재 selector
   - `#tab-workout ... .workout-date-nav` 계열은 운동 탭 DOM에서 제거된 날짜 row를 대상으로 한다.
   - 단, `#tab-diet .workout-date-nav`와 기본 `.workout-date-nav`는 식단 탭에서 실제 사용하므로 유지한다.

5. 홈 농장 stale surface
   - `index.html`에 `card-farm-duolingo`와 `farm-duolingo-content`가 남아 있지만 `home/index.js`는 `home/farm.js`를 import하거나 호출하지 않는다.
   - `home/farm.js`의 `renderFarmDuolingo()`, `renderFarmCyworld()`, `farm-inv-*`, `farm-shop-*`는 현재 화면 렌더 경로에 닿지 않는다.
   - `data.js`의 farm shop/state API는 `home/farm.js` 전용이라 함께 stale이다.

6. `workout/navigation-stack.js`의 `RECORD`/`DETAIL` route 모델, `pushWorkoutRecord()`, `pushWorkoutDetail()`
   - 현재 app renderer는 non-calendar route를 전부 하단 시트로 redirect한다.
   - 별도 detail screen 호출 경로는 남아 있지만 현재 화면 진입점에서 사용되지 않는다.

7. `index.html`의 `wt-exercise-detail-root`와 `workout/exercises.js`의 standalone detail screen
   - 현재 운동 하단 시트 카드가 실제 기록 surface이고, 별도 detail route push는 제거되어 있다.
   - `renderWorkoutExerciseDetail`은 stale route 모델 제거와 함께 감사한다.

### 보존 대상

- `data.js`, `data/data-pure.js`, `nutrition-normalize.js`, `workout/expert/*`의 legacy 데이터 migration/fallback
- `modals/ai-estimate-banner.js`, `modals/nutrition-item-modal.js`, `workout/save.js`의 stale async/save guard
- `home/life-zone.js`, `home/tomato.js`, `style.css`의 체중 미입력 stale UI 강조
- `sw.js`의 cache stale 방지와 deploy verification logic

## 실행 슬라이스

### Slice 1: 고확신 화면 미구현 잔재 제거

수정 대상:

- `app.js`
- `render-stats.js`
- `workout/load.js`
- `style.css`
- `home/farm.js`
- `data.js`
- `tests/workout-navigation-stack.test.js`
- `tests/stats-overall-compact-summary.test.js` 또는 신규/기존 source assertion 테스트
- `sw.js`

작업:

1. `openWorkoutRecordFromCalendar()`와 `window.wtOpenWorkoutRecord`를 제거한다.
2. `openWorkoutTab()`은 날짜가 있으면 `openWorkoutDaySheetFromAction()`을 직접 호출한다.
3. `setPeriod()` export와 `window.setPeriod`를 제거한다.
4. `.wt-record-back-btn` disabled 예외를 제거한다.
5. 운동 탭 전용 `.workout-date-nav` stale selector를 제거하되 식단 탭 날짜 row 스타일은 유지한다.
6. `index.html`의 빈 농장 카드와 `home/farm.js`를 제거한다.
7. `data.js`의 farm shop/state API를 제거한다.
8. `.farm-*` legacy CSS block을 제거한다.
9. source assertion을 갱신해 stale 호환 전역/selector가 다시 들어오지 않게 한다.
10. `STATIC_ASSETS` 대상 파일을 수정하므로 `sw.js` `CACHE_VERSION`을 bump하고 `home/farm.js`를 제거한다.

제외:

- `WORKOUT_ROUTES.RECORD/DETAIL` route 모델 제거
- standalone exercise detail root 제거
- 데이터 migration/fallback 제거

검증:

1. `node --check app.js`
2. `node --check render-stats.js`
3. `node --check workout/load.js`
4. `node --check sw.js`
5. `node --test tests/workout-navigation-stack.test.js tests/stats-overall-compact-summary.test.js tests/workout-calendar-bottom-sheet.test.js`
6. `node scripts/verify-runtime-assets.mjs`
7. `node --test --test-reporter=dot tests/*.test.js`
8. `git diff --check`
9. 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
10. 배포 marker: `sw.js` cache version, `app.js`에 `wtOpenWorkoutRecord` 없음, `render-stats.js`에 `setPeriod` 없음, `style.css`에 `.farm-scene`/`.farm-shop-*` 없음, `sw.js`에 `home/farm.js` 없음

### Slice 2: 운동 record/detail route 모델 제거 감사

수정 후보:

- `workout/navigation-stack.js`
- `app.js`
- `workout/exercises.js`
- `workout/index.js`
- `index.html`
- `style.css`
- `tests/workout-navigation-stack.test.js`
- `tests/workout-card-layout-css.test.js`
- `sw.js`

작업:

1. `WORKOUT_ROUTES`를 실제 화면인 calendar/sheet 중심으로 축소할 수 있는지 검증한다.
2. `pushWorkoutRecord()`/`pushWorkoutDetail()`와 record/detail snapshot 필드를 제거한다.
3. standalone `wt-exercise-detail-root`와 `renderWorkoutExerciseDetail`가 실제 진입점 없이 남은 경우 제거한다.
4. back handling은 calendar sheet open/close만 대상으로 재작성한다.

제외:

- 하단 시트 내부 운동 카드 렌더러 `_renderWorkoutExerciseDetailCard()` 제거
- 운동 picker, inline edit, timer flow 변경

검증:

1. navigation-stack 단위 테스트 재작성
2. 운동 하단 시트 regression 테스트 전체 실행
3. runtime asset verification
4. Dashboard3 Pages deploy verification

### Slice 3: 전문가/성장판 stale parameter 감사

수정 후보:

- `workout/expert/max-same-day-advice.js`
- `tests/calc.max.test.js`

작업:

1. `renderMaxGrowthPreview()`의 `recommendationHtml`처럼 입력만 받고 현재 화면에 렌더하지 않는 stale parameter를 삭제한다.
2. 테스트 fixture도 실제 화면에 남는 출력 기준으로 정리한다.

제외:

- 성장판 matrix/prediction처럼 현재 화면에 렌더되는 코드
- legacy 운동 데이터 resolver/fallback

검증:

1. `node --check workout/expert/max-same-day-advice.js`
2. `node --test tests/calc.max.test.js`
3. 전체 테스트와 deploy verification

## 다음 실행 프롬프트

없음. Slice 1, Slice 2, Slice 3 후보를 현재 화면 진입점 기준으로 감사했고 삭제 대상은 제거했다.

## 실행 결과

1. Slice 1 완료: `wtOpenWorkoutRecord`, `setPeriod`, `.wt-record-back-btn` 예외, 운동 탭 날짜 row stale selector, 홈 농장 DOM/CSS/API/모듈을 제거했다.
2. Slice 2 완료: `WorkoutRecordScreen`/`WorkoutDetailScreen` route 모델, `pushWorkoutRecord()`, `pushWorkoutDetail()`, standalone `wt-exercise-detail-root`, `renderWorkoutExerciseDetail`, 관련 CSS/export/window 등록을 제거했다.
3. Slice 3 완료: `renderMaxGrowthPreview()`의 화면 미렌더 `recommendationHtml` 파라미터와 테스트 fixture를 제거했다.
4. 보존: `_renderWorkoutExerciseDetailCard()`는 현재 하단 시트에서 운동 카드 UI를 렌더하는 활성 함수라 유지했다.
5. 검증: `node --check ...`, `node --test tests/calc.max.test.js`, targeted tests, `node scripts/verify-runtime-assets.mjs`, 전체 `node --test --test-reporter=dot @tests`, `git diff --check` PASS.
6. PASS: Dashboard3 Pages 배포 검증 — `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ c98ec70` → `[deploy-verify] ok c98ec70a4a1a tomatofarm-v20260630z12-stale-ui-prune static=233`
7. not verified yet: 인증 세션이 필요한 실제 UI 클릭 흐름은 배포 URL에서 직접 조작하지 않았다.
