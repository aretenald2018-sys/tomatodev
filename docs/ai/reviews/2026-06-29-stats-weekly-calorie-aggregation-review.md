# 건강지표 주간 누적 칼로리 집계 리뷰

## 리뷰 결과

문제 없음.

## 변경 확인

- `index.html`
  - 건강지표 카드 제목을 `체중 & 주간 누적 칼로리 추이`로 변경했다.
  - 빈 상태 문구를 주간 칼로리 기준으로 맞췄다.

- `render-stats.js`
  - 트레이너 통계 모달의 건강지표 카드 문구도 동일하게 맞췄다.
  - `_buildWeeklyKcalWeightSeries()`를 추가해 선택 기간을 주 단위 버킷으로 나누고, 각 주의 섭취칼로리와 운동칼로리를 누적 합산한다.
  - 운동칼로리는 기존과 동일하게 `calcBurnedKcal(day, weightForBurn).total`을 사용한다.
  - 그래프는 `체중`, `주간 누적 섭취칼로리`, `주간 누적 운동칼로리` 3개 선을 표출한다.
  - 그래프의 체중 값은 해당 주에 실제 체크인된 값만 사용하고, 운동칼로리 계산용 체중 fallback은 기존 방식대로 유지했다.

- `sw.js`
  - 정적 자산 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260629z23-stats-weekly-calories`로 갱신했다.

## 검증

- PASS: `node --check render-stats.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 606 tests passed
- PASS: `git diff --check`

## 남은 위험

- 인증 세션이 없는 자동 검증에서는 실제 통계 화면의 Chart.js 렌더링을 눈으로 확인하지 못한다.
- Dashboard3 Pages 배포 후 원격 자산 marker 검증이 필요하다.
