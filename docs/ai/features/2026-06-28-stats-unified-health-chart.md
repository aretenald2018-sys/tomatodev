# 통계 단일 건강 지표 차트 통합 계획

## 상태

- 단계: implemented
- 요청: 통계 탭의 체중/섭취칼로리/운동칼로리/체지방률을 하나의 위쪽 그래프에서 모두 표기하고, 아래 월간 칼로리 그래프와 맨밑 체크인 그래프를 제거한다. 체크박스로 선택한 지표만 비교하고 기간 설정에 따라 해당 기간만 본다.
- 결정: 이번 변경은 `Slice 1. 통계 단일 건강 지표 차트`만 실행한다.

## 그릴 결과

### 핵심 질문 1. 아래 월간 칼로리 리포트는 어떻게 처리할 것인가?

- 답변: 카드 전체를 제거한다.
- 결정:
  - `calorie-month-chart`, `calorie-month-empty`, `calorie-month-summary` DOM을 제거한다.
  - `_renderCalorieReport()` 호출과 월간 칼로리 전용 Chart instance를 제거한다.
  - 섭취칼로리와 운동칼로리는 위 통합 차트에 데이터셋으로 올린다.

### 핵심 질문 2. 맨밑 체중/체지방 그래프는 어떻게 처리할 것인가?

- 답변: 제거하고 체지방률을 위 통합 차트로 옮긴다.
- 결정:
  - `checkin-chart`, `checkin-chart-empty` DOM을 제거한다.
  - `_renderCheckinChart()` 호출과 별도 Chart instance를 제거한다.
  - 체중과 체지방률은 통합 차트에서 별도 y축(`kg`, `%`)으로 표시한다.

### 핵심 질문 3. 하나의 차트에서 단위가 다른 지표를 어떻게 비교할 것인가?

- 답변: Chart.js multi-axis를 사용한다.
- 결정:
  - `kg` 축: 체중
  - `kcal` 축: 섭취칼로리, 운동칼로리
  - `pct` 축: 체지방률
  - 체크박스 해제 지표는 chart dataset `hidden`으로 숨긴다.

### 핵심 질문 4. 기간 설정은 어디에 둘 것인가?

- 답변: 통합 차트 카드 안에 전용 기간 버튼을 둔다.
- 결정:
  - 30일, 60일, 90일, 전체
  - 기본값은 기존과 같은 90일.
  - 전체는 앱에 있는 cache/checkin 범위 중 가장 이른 날짜부터 오늘까지로 계산한다.

## 구현 슬라이스

### Slice 1. 통계 단일 건강 지표 차트

- 상태: implemented
- 목표: 통계 상단의 기존 `체중 & 섭취칼로리 추이` 차트를 `건강 지표 비교` 통합 차트로 바꾼다.
- 예상 변경:
  - `index.html`: 통합 차트 체크박스/기간 버튼 추가, 월간 칼로리 그래프 카드 제거, 체크인 그래프 카드 제거
  - `render-stats.js`: 통합 차트 데이터 생성, 체크박스/기간 이벤트 바인딩, 운동칼로리/체지방률 데이터셋 추가, 하위 그래프 렌더 제거
  - `style.css`: 체크박스/기간 컨트롤과 통합 차트 카드 스타일
  - `sw.js`: `CACHE_VERSION` bump
  - `tests/*`: DOM/JS marker와 cache marker 갱신
- 검증:
  - `node --check render-stats.js sw.js`
  - `node --test tests/stats-unified-health-chart.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js`
  - full test
  - `node scripts/verify-runtime-assets.mjs`

## 다음 세션 시작 기준

Slice 1 구현과 리뷰는 완료했다. 배포 브라우저가 로그인 화면에 막히면 실제 통계 UI 조작은 인증 계정에서 확인해야 한다.

## 실행 결과

- `index.html`: 상단 차트를 `건강 지표 비교` 통합 차트로 교체하고, 체중/체지방률/섭취칼로리/운동칼로리 체크박스와 30일/60일/90일/전체 기간 버튼을 추가했다. 월간 칼로리 리포트와 맨밑 체크인 그래프 DOM은 제거했다.
- `render-stats.js`: 통합 차트 전용 Chart.js instance와 multi-axis dataset 생성 로직을 추가했다. 섭취칼로리는 식단 기록, 운동칼로리는 `calcBurnedKcal()`, 체중/체지방률은 체크인 기록에서 가져온다.
- `style.css`: 통합 차트의 체크박스/기간 버튼 스타일을 추가했다.
- `sw.js`: `STATIC_ASSETS` 대상 파일 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260628z2-stats-unified-health-chart`로 갱신했다.
- `tests/stats-unified-health-chart.test.js`: 신규 통합 차트 DOM, JS 로직 marker, 제거된 하위 그래프, cache marker를 검증한다.

## 실행 검증

- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/stats-picker-ui-polish.test.js tests/stats-muscle-fatigue-insight.test.js` — 12 tests passed
- PASS: `node --test @tests` — 573 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ a3af29d` — deployed `a3af29dd4f05`, `tomatofarm-v20260628z2-stats-unified-health-chart`, `static=221`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...` — `health-metrics-chart`, `data-health-series`, `data-health-period`, `HEALTH_CHART_SERIES`, `_renderHealthMetricsChart`, `checkin?.bodyFatPct`, `.stats-health-toggle`, `.stats-health-period`

## Slice 2 요청

- 사용자 피드백: 트레이너 모달의 `내 운동 통계`에서 보이는 건강 지표 비교 그래프 선이 꺾임이 강하므로 더 흐르는 부드러운 선으로 바꾼다.

## Slice 2 계획

- `render-stats.js`: 건강 지표 비교 차트 dataset에 monotone cubic interpolation, 더 높은 tension, 둥근 cap/join을 적용한다.
- `render-stats.js`: 점 반경을 줄이고 hit radius를 유지해 터치 영역은 유지하면서 시각적으로 점이 덜 튀게 한다.
- `tests/stats-unified-health-chart.test.js`: 부드러운 선 렌더링 옵션과 cache marker를 회귀 테스트한다.
- `sw.js`: `render-stats.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

## Slice 2 구현 기록

- `render-stats.js`: `_healthDataset()`에 `cubicInterpolationMode: 'monotone'`, `tension: 0.45`, `borderCapStyle: 'round'`, `borderJoinStyle: 'round'`를 추가했다.
- `render-stats.js`: 선 두께를 `2.5`로 살짝 키우고 `pointRadius`를 `2`로 줄였으며 `pointHitRadius`는 `12`로 유지해 터치 판정 영역을 보존했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z15-smooth-health-chart`로 bump했다.

## Slice 2 로컬 검증

- PASS: `node --check render-stats.js; node --check sw.js`
- PASS: `node --test tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/stats-overall-compact-summary.test.js` — 13 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=850`
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 583 tests passed
- PASS: `git diff --check`
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` — `HTTP/1.1 200 OK`
