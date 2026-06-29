# 건강지표 월간 칼로리 리포트 카드 병합 리뷰

## 리뷰 결과

문제 없음.

## 변경 확인

- `index.html`
  - `stats-calorie-report-block` 별도 카드를 제거했다.
  - `월간 칼로리 리포트` 영역을 `stats-health-block` 내부의 `stats-health-report` 하위 섹션으로 이동했다.

- `render-stats.js`
  - 트레이너 통계 모달에서도 동일하게 월간 칼로리 리포트를 건강지표 카드 안에 포함했다.
  - 기존 `_renderKcalWeightChart`, `_renderCalorieReport` 렌더링 함수는 유지했다.

- `style.css`
  - 카드 내부 하위 섹션용 `stats-health-report`, `stats-subblock-title` 스타일을 추가했다.

- `sw.js`
  - 정적 자산 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260629z21-stats-health-calorie-merge`로 갱신했다.

## 검증

- PASS: `node --check render-stats.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 14 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 606 tests passed
- PASS: `git diff --check`

## 남은 위험

- 인증 세션이 없는 자동 브라우저에서는 실제 `더보기 -> 통계` 화면과 트레이너 통계 모달의 시각 상태를 직접 클릭 검증하지 못한다.
- Dashboard3 Pages 배포 후 정적 마커 검증이 필요하다.
