# 통계 단일 건강 지표 차트 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-28-stats-unified-health-chart.md`
- Slice: `통계 단일 건강 지표 차트`

## 리뷰 결과

- Blocking issue 없음.
- 상단 통계 카드는 `건강 지표 비교` 단일 Chart.js instance로 교체됐고, 체중/체지방률/섭취칼로리/운동칼로리만 같은 그래프에서 선택 비교한다.
- 기존 `calorie-month-chart`, `calorie-month-empty`, `calorie-month-summary`, `checkin-chart`, `checkin-chart-empty` DOM과 전용 렌더 함수 호출이 제거됐다.
- 체크박스는 `data-health-series`, 기간 버튼은 `data-health-period`로 직접 바인딩되어 통계 탭 재렌더 시에도 기존 선택 상태를 유지한다.
- 단위가 다른 지표는 `weight`, `kcal`, `pct` y축으로 분리했다. 섭취/운동 칼로리는 같은 `kcal` 축을 공유하고, 체중과 체지방률은 각각 별도 축을 사용한다.
- `style.css`, `index.html`, `render-stats.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION` bump와 cache marker 테스트 갱신이 포함됐다.

## 검증

- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js` — 12 tests passed
- PASS: `node --test @tests` — 573 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a3af29d` — deployed `a3af29dd4f05`, `tomatofarm-v20260628z2-stats-unified-health-chart`, `static=221`
- PASS: deployed markers — `health-metrics-chart`, `data-health-series`, `data-health-period`, `HEALTH_CHART_SERIES`, `_renderHealthMetricsChart`, `checkin?.bodyFatPct`, `.stats-health-toggle`, `.stats-health-period`
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` — `HTTP/1.1 200 OK`

## 남은 확인

- not verified yet: 인증 세션이 없어 실제 통계 탭에서 체크박스/기간 버튼 조작은 인증 계정에서 확인해야 한다.
