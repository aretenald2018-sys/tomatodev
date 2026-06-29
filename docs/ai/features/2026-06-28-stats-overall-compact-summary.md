# 전체통계 중복 집계 컴팩트 정리 계획

## 상태

- 단계: implemented
- 요청: 전체통계 탭 안에서 같은 집계가 여러 카드로 반복 표출되는 부분을 정리하고, 더 컴팩트하게 보여준다.
- 결정: 이번 변경은 `Slice 1. 전체통계 컴팩트 요약`만 실행한다.

## 그릴 결과

### 핵심 질문 1. 어떤 집계가 중복인가?

- 코드 확인:
  - `stats-muscle-fatigue`는 이미 기간별 부위 활성, 운동일, 세트, 볼륨 요약을 제공한다.
  - 그 아래 `부위별 운동 비중 (최근 14일)`과 `기간별 운동 횟수`는 같은 부위/운동일 집계를 레거시 방식으로 다시 보여준다.
  - `전체 기록 리포트`와 `식단 달성 단계 (올해)`는 평균 칼로리, 식단 성공/실패, 달성률 성격의 요약을 별도 카드로 나누어 보여준다.
  - `월별 운동 일수`는 현재 전체통계에서 월별 성공/운동 집계를 별도 row로 반복한다.
- 결정:
  - 부위 집계는 `stats-muscle-fatigue` 하나만 남긴다.
  - 식단/활동/체성분 요약은 하나의 `전체 요약` 카드로 합친다.
  - 월별 운동 일수 row는 제거한다. 월별/연간 세부 흐름은 필요 시 심층통계나 별도 차트 영역에서 다룬다.

### 핵심 질문 2. 컴팩트 요약에 무엇을 남길 것인가?

- 답변: 사용자가 빠르게 읽어야 하는 KPI와 기록 특이값만 남긴다.
- 결정:
  - KPI grid: 기록일, 운동일, 식단 성공률, 평균 섭취, 평균 운동, 이달 체중 변화
  - detail list: 최다 음식, 최고 섭취일, 최고 운동일, 평균 체성분, 평균 영양소, 생활지표
  - 값이 없는 항목은 `데이터 없음`으로 보이되, 긴 행 카드 반복은 만들지 않는다.

### 핵심 질문 3. 기존 전역 함수/캐시와의 호환성은 어떻게 처리할 것인가?

- 답변: 앱이 오래된 markup을 잠깐 들고 있어도 깨지지 않게 보수적으로 유지한다.
- 결정:
  - `setPeriod()` export는 stale cached HTML 호환용으로 유지하되, 더 이상 새 DOM에서는 사용하지 않는다.
  - `index.html`, `render-stats.js`, `style.css`는 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 bump한다.

## 구현 슬라이스

### Slice 1. 전체통계 컴팩트 요약

- 상태: implemented
- 목표: 전체통계 탭의 중복 집계 카드를 제거하고 하나의 compact summary card로 통합한다.
- 예상 변경:
  - `index.html`: `전체 기록 리포트`를 `전체 요약`으로 교체, `부위별 운동 비중`, `기간별 운동 횟수`, `식단 달성 단계`, `월별 운동 일수` 카드 제거
  - `render-stats.js`: `_renderOverallMetadata()`를 compact summary renderer로 교체, 레거시 muscle/diet/monthly 렌더 호출 제거
  - `style.css`: compact summary KPI/detail 스타일 추가
  - `sw.js`: cache version bump
  - `tests/*`: compact summary DOM/JS/cache marker 테스트 추가 및 cache marker 갱신
- 검증:
  - `node --check render-stats.js; node --check sw.js`
  - `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js`
  - full test
  - `node scripts/verify-runtime-assets.mjs`
  - Dashboard3 Pages 배포 검증

## 다음 세션 시작 기준

Slice 1 구현과 리뷰는 완료했다. 배포 브라우저가 로그인 화면에 막히면 실제 통계 UI 조작은 인증 계정에서 확인해야 한다.

## 실행 결과

- `index.html`: `전체 기록 리포트`를 `전체 요약` 카드로 교체하고, `부위별 운동 비중`, `기간별 운동 횟수`, `식단 달성 단계`, `월별 운동 일수` 카드를 제거했다.
- `render-stats.js`: `_renderOverallSummary()`를 추가해 기록일, 운동일, 식단 성공률, 평균 섭취/운동 칼로리, 이달 체중 변화와 핵심 detail을 한 카드에 렌더한다. 레거시 muscle/diet/monthly 렌더 호출과 함수는 제거했다.
- `style.css`: compact summary KPI grid와 detail list 스타일을 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z3-stats-overall-compact-summary`로 갱신했다.
- `tests/stats-overall-compact-summary.test.js`: 전체통계 중복 카드 제거, compact renderer, cache marker를 검증한다.

## 실행 검증

- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js` — 15 tests passed
- PASS: `node --test @tests` — 576 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0228c1e` — deployed `0228c1e4250d`, `tomatofarm-v20260628z3-stats-overall-compact-summary`, `static=221`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...` — `stats-overall-summary`, `stats-summary-block`, `_renderOverallSummary`, `stats-summary-kpi`, `hasDietRecord(ny,m,d)`, `.stats-summary-kpis`, `.stats-summary-fact`
- PASS: deployed absence check — `stats-metadata-summary`, `muscle-14d`, `muscle-period`, `diet-stats`, `monthly-summary`, `부위별 운동 비중`, `기간별 운동 횟수`, `식단 달성 단계`, `월별 운동 일수` 없음
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` — `HTTP/1.1 200 OK`
