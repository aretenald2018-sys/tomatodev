# 운동별 퍼포먼스 성장중 색상 수정 계획

## 상태

- 상태: `implemented`
- 요청: `운동별 퍼포먼스 추이` 표에서 `성장중` 판정 텍스트를 파란색으로 표시한다.
- 범위: 색상 스타일, 캐시 버전, 관련 회귀 테스트만 수정한다.

## 그릴 결과

- 핵심 질문: `성장중` 색상을 바꾸면서 판정 로직이나 표 구조도 함께 바꿀 필요가 있는가?
- 답변/결정: 아니다. 사용자가 지적한 문제는 `성장중` 텍스트가 빨간색으로 보이는 시각 표현이다.
- 남은 가정: 파란색은 현재 운동별 퍼포먼스 표의 추정 1RM 스파크라인과 맞는 `#2563eb`을 사용한다.

## 실행 Slice 1

1. `style.css`에서 `.stats-perf-row.is-growth .stats-perf-status b` 색상을 토마토 레드 계열이 아닌 파란색으로 바꾼다.
2. `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 갱신한다.
3. 캐시 버전 테스트와 성장 판정 색상 회귀 테스트를 갱신한다.

## 제외 범위

- `성장중`, `유지중`, `점검필요` 판정 계산 로직은 변경하지 않는다.
- 운동별 퍼포먼스 표의 컬럼, 정렬, 데이터 집계는 변경하지 않는다.
- 건강지표/칼로리 그래프는 변경하지 않는다.

## 검증

1. `node --check sw.js`
2. `node --test tests/stats-exercise-performance.test.js tests/stats-overall-compact-summary.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test tests/*.test.js`
5. `git diff --check`
6. `origin/main` 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. 배포 URL의 `style.css`에서 `.stats-perf-row.is-growth .stats-perf-status b { color: #2563eb; }`가 내려오는지 확인한다.

## 실행 결과

- `style.css`의 `성장중` 판정 텍스트 색상을 `#2563eb`로 변경했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z25-stats-growth-blue`로 갱신했다.
- 관련 캐시 버전 테스트와 성장 판정 색상 회귀 테스트를 갱신했다.

## 로컬 검증

- PASS: `node --check sw.js`
- PASS: `node --test tests/stats-exercise-performance.test.js tests/stats-overall-compact-summary.test.js` — 8 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=860`
- PASS: `node --test tests/*.test.js` — 606 tests passed
- PASS: `git diff --check`

## 배포 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>` — `tomatofarm-v20260629z25-stats-growth-blue` 확인
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ "sw.js::tomatofarm-v20260629z25-stats-growth-blue" "style.css::.stats-perf-row.is-growth .stats-perf-status b { color: #2563eb; }"`
