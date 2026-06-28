# 전체통계 컴팩트 요약 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-28-stats-overall-compact-summary.md`
- Slice: `전체통계 컴팩트 요약`

## 리뷰 결과

- Blocking issue 없음.
- `stats-muscle-fatigue`가 이미 제공하는 부위/기간 집계를 남기고, 하단의 `부위별 운동 비중`과 `기간별 운동 횟수` 레거시 카드는 제거됐다.
- 식단 성공/실패/달성률과 평균 칼로리는 `전체 요약` KPI grid로 합쳐졌고, 별도 `식단 달성 단계` 카드는 제거됐다.
- `월별 운동 일수` row는 전체통계 화면에서 제거되어 같은 성격의 월별/기록일 집계 반복을 줄였다.
- `setPeriod()` export는 stale cached HTML 호환용으로 유지되어 오래된 markup에서 호출돼도 module export 누락으로 깨지지 않는다.
- `index.html`, `render-stats.js`, `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache marker bump와 테스트 갱신이 포함됐다.

## 검증

- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js` — 15 tests passed
- PASS: `node --test @tests` — 576 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0228c1e` — deployed `0228c1e4250d`, `tomatofarm-v20260628z3-stats-overall-compact-summary`, `static=221`
- PASS: deployed markers — `stats-overall-summary`, `stats-summary-block`, `_renderOverallSummary`, `stats-summary-kpi`, `hasDietRecord(ny,m,d)`, `.stats-summary-kpis`, `.stats-summary-fact`
- PASS: deployed absence check — 제거 대상 중복 카드 id/문구 없음
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` — `HTTP/1.1 200 OK`

## 남은 확인

- not verified yet: 인증 세션이 없어 실제 통계 탭에서 compact summary 시각 상태는 인증 계정에서 확인해야 한다.
