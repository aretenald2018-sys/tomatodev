# 화면 미구현 stale 코드 제거 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-30-stale-ui-code-prune.md`
- 변경 범위:
  - 홈 농장 stale surface 제거
  - 운동 record/detail stale route 및 standalone detail surface 제거
  - 전체통계 `setPeriod` cached HTML 호환 제거
  - 성장판 미리보기 미사용 파라미터 제거
  - 관련 테스트/source assertion/cache version 갱신

## 결과

문제 없음. 현재 화면 진입점에서 실제 렌더/동작하지 않는 stale 코드만 제거했고, 실제 동작 중인 하단 시트 운동 카드 렌더러 `_renderWorkoutExerciseDetailCard()`와 데이터 보존용 legacy/stale guard는 유지했다.

## 확인한 회귀 방지 포인트

1. `home/farm.js`, `card-farm-duolingo`, `.farm-*`, farm shop/state API가 제거됐다.
2. `WorkoutRecordScreen`/`WorkoutDetailScreen`, `pushWorkoutRecord()`, `pushWorkoutDetail()`, standalone `wt-exercise-detail-root`가 제거됐다.
3. `renderWorkoutExerciseDetail`, `clearWorkoutExerciseDetail`, `wtFocusWorkoutEntryFromDetail` export/window 등록이 제거됐다.
4. `setPeriod()`와 `window.setPeriod`가 제거됐다.
5. `renderMaxGrowthPreview()`의 미렌더 `recommendationHtml` 입력이 제거됐다.
6. 테스트가 위 stale surface 재도입을 `doesNotMatch`로 막는다.
7. `sw.js` cache version은 `tomatofarm-v20260630z12-stale-ui-prune`다.

## 검증

- PASS: `node --check app.js; node --check data.js; node --check data/data-load.js; node --check render-stats.js; node --check render-workout.js; node --check sw.js; node --check workout/load.js; node --check workout/navigation-stack.js; node --check workout/exercises.js; node --check workout/index.js; node --check workout/expert/max-same-day-advice.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js tests/workout-calendar-bottom-sheet.test.js tests/stats-overall-compact-summary.test.js tests/data.load-save.test.js tests/exercise-program-editor.test.js`
- PASS: `node --test tests/calc.max.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=858`
- PASS: `node --test --test-reporter=dot @tests`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ c98ec70` — `[deploy-verify] ok c98ec70a4a1a tomatofarm-v20260630z12-stale-ui-prune static=233`

## 남은 리스크

not verified yet: 인증 세션이 필요한 실제 모바일 UI 클릭 흐름은 배포 URL에서 직접 조작하지 않았다.
