# 건강 지표 비교 차트 스무딩 리뷰

## 리뷰 범위

- 계획 문서: `docs/ai/features/2026-06-28-stats-unified-health-chart.md` Slice 2
- 변경 대상: `render-stats.js`, `sw.js`, 관련 cache marker 테스트

## Findings

- 발견된 차단 이슈 없음.

## 확인 사항

- 데이터 집계 로직은 변경하지 않고 Chart.js dataset 렌더링 옵션만 조정했다.
- `cubicInterpolationMode: 'monotone'`, `tension: 0.45`, 둥근 cap/join을 적용해 꺾임이 강한 선을 더 부드럽게 보이도록 했다.
- `pointRadius`는 줄이고 `pointHitRadius`는 유지해 시각적 점 밀도는 낮추되 터치/툴팁 접근성은 보존했다.
- `render-stats.js`가 `sw.js` `STATIC_ASSETS`에 포함되어 있어 `CACHE_VERSION`을 `tomatofarm-v20260628z15-smooth-health-chart`로 bump했다.

## 검증

- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 13 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`

## 잔여 리스크

- 실제 모바일 화면에서 선의 부드러움과 점 밀도는 인증 계정 데이터로 추가 눈검수가 필요하다.
