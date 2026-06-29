# 건강지표 주간 운동칼로리 렌더 누락 수정 리뷰

## 리뷰 결과

문제 없음.

## 원인

`주간 누적 운동칼로리` 선이 보이지 않은 이유는 그래프 집계에서 운동칼로리 계산용 day로 식단 전용 `getDiet()` 결과를 넘겼기 때문이다. `getDiet()` 결과에는 `exercises`, `running`, `swimming`, `cf` 같은 운동 필드가 없어서 `calcBurnedKcal()` 결과가 0이 됐다.

## 변경 확인

- `render-stats.js`
  - `_statsDietDayFromKey()`와 `_statsWorkoutDayFromKey()`로 식단 day와 운동 day를 분리했다.
  - `_buildWeeklyKcalWeightSeries()`에서 섭취칼로리는 식단 day, 운동칼로리는 원본 cache workout day로 계산한다.
  - `_renderCalorieReport()` 하단 요약 KPI의 `운동` 값도 원본 cache workout day 기준으로 계산한다.

- `sw.js`
  - 정적 자산 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260629z24-stats-weekly-burned-fix`로 갱신했다.

- `tests/stats-unified-health-chart.test.js`
  - 주간 그래프가 `calcBurnedKcal(workoutDay, weightForBurn).total`을 쓰는 계약을 추가했다.
  - 하단 요약 KPI도 `calcBurnedKcal(workoutDay, weight).total`을 쓰는 계약을 추가했다.

## 검증

- PASS: `node --check render-stats.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 606 tests passed
- PASS: `git diff --check`

## 남은 위험

- 인증 세션이 없는 자동 검증에서는 실제 통계 화면에서 초록색 운동칼로리 선이 시각적으로 그려지는지 직접 클릭 확인하지 못한다.
