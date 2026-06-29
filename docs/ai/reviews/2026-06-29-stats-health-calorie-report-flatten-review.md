# 건강지표 월간 칼로리 리포트 평탄화 리뷰

## 리뷰 결과

문제 없음.

## 변경 확인

- `index.html`
  - `calorie-month-chart` 두 번째 그래프를 제거했다.
  - `월간 칼로리 리포트` 하위 제목을 제거했다.
  - `calorie-month-summary`만 `체중 & 섭취칼로리 추이` 카드 내부에 남겼다.

- `render-stats.js`
  - 트레이너 통계 모달에서도 두 번째 그래프와 하위 제목을 제거했다.
  - `_renderCalorieReport()`는 Chart 렌더링이 아니라 월간 요약 KPI 렌더링만 담당하도록 정리했다.
  - `_calorieMonthCharts`와 별도 월간 차트 생성 경로를 제거했다.

- `style.css`
  - 별도 하위 제목 스타일을 제거했다.
  - 월간 요약 KPI는 건강지표 카드 안에서 위 그래프 아래에 바로 붙도록 여백만 유지했다.
  - 기존 월간 그래프의 운동칼로리 정보는 요약 KPI `운동`으로 보존했다.

- `sw.js`
  - 정적 자산 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260629z22-stats-health-calorie-flat`으로 갱신했다.

## 검증

- PASS: `node --check render-stats.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 606 tests passed
- PASS: `git diff --check`

## 남은 위험

- 인증 세션이 없는 자동 브라우저에서는 실제 트레이너 통계 모달 화면의 스크롤 위치별 시각 상태를 직접 클릭 검증하지 못한다.
- Dashboard3 Pages 배포 후 정적 마커 검증이 필요하다.
