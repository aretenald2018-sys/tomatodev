# 건강지표 월간 칼로리 리포트 평탄화 계획

## 배경

직전 변경은 `월간 칼로리 리포트`를 같은 카드 내부로 옮겼지만, 화면에서는 제목과 두 번째 그래프가 남아 별도 카드처럼 보인다. 사용자의 “합치라”는 의도는 카드 DOM 부모만 합치는 것이 아니라, 중복 그래프를 없애고 위 건강지표 카드 흐름 안에서 정보가 한 덩어리로 읽히게 하는 것이다.

## 목표

- `월간 칼로리 리포트` 제목과 두 번째 그래프를 제거한다.
- 월간 리포트의 핵심 정보는 `체중 & 섭취칼로리 추이` 카드 하단 요약 KPI로만 표출한다.
- 중복되는 섭취칼로리 그래프는 하나만 남긴다.
- 전체통계와 트레이너 통계 모달 양쪽을 동일하게 맞춘다.

## 실행 슬라이스

1. `index.html`, `render-stats.js`
   - `calorie-month-chart`, `calorie-month-empty`, `stats-subblock-title` 기반 제목을 제거한다.
   - `calorie-month-summary`만 건강지표 카드 내부에 남긴다.

2. `render-stats.js`
   - `_renderCalorieReport()`를 차트 렌더러가 아니라 월간 칼로리 요약 렌더러로 바꾼다.
   - `_calorieMonthCharts`와 두 번째 Chart 생성 경로를 제거한다.

3. `style.css`
   - 카드 내부 구분선/하위 제목 스타일을 제거하고, 요약 KPI가 위 그래프 아래에 자연스럽게 이어지도록 여백만 둔다.

4. 캐시/테스트
   - `sw.js` 캐시 버전 갱신.
   - 별도 월간 그래프와 제목이 없는 계약을 테스트로 고정.

## 검증

- `node --check render-stats.js`
- `node --check sw.js`
- `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js`
- `node scripts/verify-runtime-assets.mjs`
- `node --test tests/*.test.js`
- `git diff --check`
- Dashboard3 Pages 배포 검증
