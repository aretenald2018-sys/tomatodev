# 건강지표 주간 운동칼로리 렌더 누락 수정 계획

## 진단

건강지표 그래프에는 `주간 누적 운동칼로리` 데이터셋과 범례가 생성되지만 실제 선이 보이지 않는다. 원인은 `_buildWeeklyKcalWeightSeries()`가 주간 집계 입력으로 `getDiet()` 결과를 반환하는 `_statsDayFromKey()`를 사용한 데 있다. `getDiet()` 결과에는 `exercises`, `running`, `swimming`, `cf` 같은 운동 필드가 없으므로 `calcBurnedKcal(day, weightForBurn).total`이 0이 된다.

같은 이유로 건강지표 카드 아래 요약 KPI의 `운동` 값도 `-`로 떨어질 수 있다. `_renderCalorieReport()`도 운동칼로리 계산에 `getDiet()` 결과를 넣고 있다.

## 목표

- 섭취칼로리는 식단 전용 객체 기준으로 계산한다.
- 운동칼로리는 원본 workout day/cache 객체 기준으로 계산한다.
- 그래프의 `주간 누적 운동칼로리` 선과 하단 `운동 kcal` KPI가 같은 운동 데이터 소스를 사용하게 한다.
- 기존 월간 리포트 재분리나 새 카드 생성은 하지 않는다.

## 실행 슬라이스

1. `render-stats.js`
   - 식단 day와 운동 day를 분리하는 helper를 둔다.
   - `_buildWeeklyKcalWeightSeries()`에서 `intake`는 식단 day, `burned`는 workout day로 계산한다.
   - `_renderCalorieReport()`에서 운동칼로리는 `getDiet()`가 아니라 `cache[key]` 원본 day로 계산한다.

2. 캐시/테스트
   - `sw.js` 캐시 버전을 갱신한다.
   - 통합 건강지표 테스트에 식단 day와 workout day 분리 계약을 추가한다.

## 검증

- `node --check render-stats.js`
- `node --check sw.js`
- `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test tests/*.test.js`
- `git diff --check`
- Dashboard3 Pages 배포 검증
