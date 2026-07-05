# 2026-07-06 Stats Raw Export Download 리뷰

## 결과

- 판정: PASS
- 계획: `docs/ai/features/2026-07-06-stats-raw-export-download.md`
- 범위: 통계 탭 기간별 운동분석 카드 위에 전체통계 JSON 다운로드 버튼을 추가하고, 일자별 운동/식단 raw 데이터를 export payload로 구성한다.

## 변경 요약

1. `index.html`의 기간별 운동분석 컨트롤 상단에 `전체통계 다운로드` 버튼을 배치했다.
2. `render-stats.js`에 `buildStatsRawExport()`와 다운로드 핸들러를 추가해 `data.js` cache 기반 일자별 운동/식단 raw snapshot, schema payload key, body checkin raw 데이터를 JSON으로 내보낸다.
3. `style.css`에 TDS/Seed token 기반 버튼 스타일과 모바일 폭 대응을 추가했다.
4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260706z4-stats-raw-export`로 bump하고 관련 cache marker 테스트를 갱신했다.

## 검증

1. PASS: `node --check render-stats.js`
2. PASS: `node --test tests/stats-raw-export-download.test.js tests/stats-overall-compact-summary.test.js tests/stats-exercise-performance.test.js tests/stats-unified-health-chart.test.js`
3. PASS: `node --test tests/*.test.js` - 709 pass
4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=882`
5. PASS: Puppeteer static visual QA - mobile/desktop에서 버튼이 기간 버튼 위, 분석 카드 위에 있고 텍스트 clipping 없음

## 잔여 확인

- GitHub Pages production deploy 후 `verify:deploy`와 실제 통계 탭 다운로드 flow 확인이 필요하다.
