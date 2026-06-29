# 건강지표 주간 누적 칼로리 집계 계획

## 배경

현재 건강지표 카드의 메인 그래프는 `체중`과 일별 `섭취칼로리`를 같은 그래프에 표출한다. 일별 섭취칼로리는 점과 선 밀도가 높아 화면이 복잡하고, 직전 변경으로 아래 요약 KPI에만 남긴 운동칼로리 흐름을 메인 추이에서 읽기 어렵다. 사용자는 단순 섭취칼로리 대신 `주당 누적 섭취칼로리`와 `주당 누적 운동칼로리`를 표출하라고 요청했다.

## 목표

- 건강지표 카드의 메인 그래프를 `체중`, `주간 누적 섭취칼로리`, `주간 누적 운동칼로리`로 바꾼다.
- 일별 kcal 점을 그대로 찍지 않고, 설정된 기간 안에서 주 단위 버킷으로 합산해 밀도를 줄인다.
- 전체통계와 트레이너 통계 모달이 같은 렌더러를 쓰도록 유지한다.
- 별도 `월간 칼로리 리포트` 카드나 두 번째 그래프는 되살리지 않는다.

## 실행 슬라이스

1. `index.html`, `render-stats.js`
   - 건강지표 카드 제목과 빈 상태 문구를 주간 누적 칼로리 기준으로 바꾼다.
   - 트레이너 통계 모달 마크업도 같은 문구로 맞춘다.

2. `render-stats.js`
   - `_renderKcalWeightChart()`의 kcal 데이터를 일별 섭취에서 주간 누적 섭취/운동으로 변경한다.
   - 주간 버킷은 선택 기간의 시작일과 종료일에 맞춰 잘라서 계산한다.
   - 운동칼로리는 기존과 동일하게 `calcBurnedKcal(day, weightForBurn).total`을 사용한다.

3. 캐시/테스트
   - `sw.js` 캐시 버전을 갱신한다.
   - 통합 건강지표 테스트에서 주간 누적 섭취/운동칼로리 계약을 고정한다.

## 검증

- `node --check render-stats.js`
- `node --check sw.js`
- `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test tests/*.test.js`
- `git diff --check`
- Dashboard3 Pages 배포 검증
