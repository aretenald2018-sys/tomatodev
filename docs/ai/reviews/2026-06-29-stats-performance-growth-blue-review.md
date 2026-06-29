# 운동별 퍼포먼스 성장중 색상 수정 리뷰

## 결론

- 발견 사항: 없음.
- 요청 범위대로 `성장중` 판정 텍스트만 파란색으로 바뀌었고, 판정 로직과 표 구조는 변경되지 않았다.

## 확인한 변경

- `style.css`: `.stats-perf-row.is-growth .stats-perf-status b` 색상을 `var(--diet-ok)`에서 `#2563eb`으로 변경했다.
- `sw.js`: `style.css` 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260629z25-stats-growth-blue`로 갱신했다.
- `tests/stats-exercise-performance.test.js`: 성장 판정이 파란색을 쓰고 토마토 레드 토큰을 쓰지 않는 회귀 검증을 추가했다.
- `tests/*.test.js`: 서비스워커 캐시 버전 기대값을 새 버전으로 동기화했다.

## 검증

- PASS: `node --check sw.js`
- PASS: `node --test tests/stats-exercise-performance.test.js tests/stats-overall-compact-summary.test.js` — 8 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 606 tests passed
- PASS: `git diff --check`

## 남은 확인

- Dashboard3 Pages 배포 후 `style.css` 원격 자산에서 `#2563eb` 규칙이 내려오는지 확인한다.
