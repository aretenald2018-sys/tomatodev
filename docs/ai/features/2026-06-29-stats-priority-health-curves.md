# 운동통계 카드 우선순위와 건강지표 곡선 정리 계획

## 상태

- 상태: `ready_for_execution`
- 생성일: 2026-06-29
- 사용자 요청: 운동통계 최상단은 `운동 활성 부위` 카드여야 하며, `전체 요약` 카드는 그 다음에 와야 한다. 건강지표카드는 여러 그래프가 겹쳐 정신사나우므로 하나의 지표를 하나의 곡선처럼 보이게 정리한다. 전체요약카드는 TDS 폰트/디자인 시스템과 맞게 통일한다.

## /diagnose

1. `index.html`의 현재 통계 순서는 기간 컨트롤 다음 `전체 요약 -> 운동 분석 -> 운동 활성 부위 -> 건강 지표 비교 -> 볼륨`이다.
2. 트레이너 통계 모달의 `_trainerQuestStatsMarkup()`도 `전체 요약`을 먼저 렌더링하고, `운동 활성 부위`는 건강지표 뒤에 있다.
3. 건강지표는 `#health-metrics-chart` 단일 캔버스에 체중, 체지방률, 섭취칼로리, 운동칼로리를 동시에 올리고 세 개의 y축을 쓴다. 이 구조가 사용자가 말한 “정신사나움”의 직접 원인이다.
4. 전체요약 스타일은 일부 수치에 `var(--font-mono)`를 쓰고 격자형 테이블 질감이 강해 현재 TDS 카드 톤과 어긋난다.

## 그릴 결과

- 질문: 건강지표를 완전히 숨길지, 지표별 단일 곡선 카드로 나눌지?
- 코드 기준 결정: 숨기지 않고 지표별 작은 카드로 분리한다. 각 카드에는 하나의 지표와 하나의 선만 표시한다.
- 질문: 카드 순서를 통계 탭에만 적용할지, 트레이너의 `내 운동 통계` 모달에도 적용할지?
- 코드 기준 결정: 두 화면 모두 같은 정보 흐름을 써야 하므로 통계 탭과 트레이너 통계 모달을 같이 정렬한다.

## Slice 1 범위

### 구현

1. `index.html` 통계 본문 순서를 `운동 활성 부위 -> 전체 요약 -> 운동 분석 -> 건강 지표 -> 볼륨`으로 바꾼다.
2. `render-stats.js` 트레이너 통계 마크업도 같은 순서로 바꾼다.
3. 건강지표의 체크박스 기반 다중 오버레이를 제거하고, 기간 프리셋만 유지한다.
4. 건강지표 렌더러를 `체중`, `체지방률`, `섭취칼로리`, `운동칼로리`별 단일 곡선 카드로 렌더링한다.
5. 전체요약 카드의 숫자/라벨 폰트와 간격을 TDS 카드 톤으로 정리한다.
6. `STATIC_ASSETS` 파일 변경에 맞춰 `sw.js` 캐시 버전을 올린다.
7. 관련 테스트를 새 구조에 맞게 갱신한다.

### 비범위

- 통계 산식 자체 변경.
- 신규 날짜 범위 picker 추가.
- 차트 라이브러리 교체.
- 운동활성부위 산출 로직 변경.

## 검증

1. `node --check render-stats.js`
2. `node --check sw.js`
3. `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test tests/*.test.js`
6. `git diff --check`
7. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
8. 배포 자산 마커에서 새 cache version, `stats-health-curves`, `health-metrics-charts`, `stats-muscle-fatigue-block` 우선 배치를 확인한다.

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-06-29-stats-priority-health-curves.md`의 Slice 1을 실행한다.

## 실행 결과

- 완료한 Slice: `Slice 1`
- 변경:
  1. 통계 탭 카드 순서를 `운동 활성 부위 -> 전체 요약 -> 운동 분석 -> 건강 지표 -> 볼륨`으로 변경했다.
  2. 트레이너의 `내 운동 통계` 모달도 동일한 순서로 정렬했다.
  3. 건강지표의 체크박스 기반 다중 오버레이 차트를 제거하고, 지표별 카드에 하나의 곡선만 렌더링하도록 바꿨다.
  4. 전체요약 카드의 수치/라벨 폰트와 카드 간격을 TDS 카드 톤에 맞춰 정리했다.
  5. `sw.js` 캐시 버전을 `tomatofarm-v20260629z16-stats-priority-health-curves`로 올렸다.
  6. 통계/트레이너/캐시 마커 회귀 테스트를 새 구조에 맞게 갱신했다.

## 검증 결과

1. PASS: `node --check render-stats.js`
2. PASS: `node --check sw.js`
3. PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js` — 18 tests passed
4. PASS: `node scripts/verify-runtime-assets.mjs` — refs=860
5. PASS: `node --test tests/*.test.js` — 603 tests passed
6. PASS: `git diff --check`
7. not verified yet: Dashboard3 Pages 배포 검증과 실제 배포 URL 마커 확인은 커밋/푸시 후 수행한다.

## Slice 2 범위

### 사용자 추가 요청

1. 전체통계 상단 기간 토글에 `이번주`를 추가한다.
2. 화면에 기간 토글이 중복으로 보이지 않게 하고, 상단 기간 토글 기준으로 아래 데이터가 함께 집계되게 한다.
3. 건강지표 그래프는 지표별 카드가 아니라 하나의 그래프에서 표출하되, 선을 얇게 하고 점/축 밀도를 줄인다.
4. `종목별 볼륨 추이` 카드 위에 `운동별 퍼포먼스 추이` 카드를 추가한다. 상단 기간 토글 기준으로 자주 하는 가슴/등/어깨/하체/이두/삼두/복근 운동을 각 2개까지 보여주고, 각 행은 운동명, 볼륨 추이, 추정 1RM 추이, 성장 판정을 제공한다.

### 구현

1. `STATS_ANALYSIS_PERIODS`에 `이번주`를 추가하고, 월요일부터 오늘까지의 기간을 계산한다.
2. 상단 기간 토글 변경 시 `운동 활성 부위`, `전체 요약`, `운동 분석`, `건강 지표`를 모두 다시 렌더링한다.
3. `운동 활성 부위` 내부 `주별/월별` 토글을 제거하고 상단 기간 범위를 그대로 사용한다.
4. 건강지표 내부 `30일/60일/90일/전체` 토글을 제거하고 상단 기간 범위를 그대로 사용한다.
5. 건강지표는 단일 canvas에 체중/체지방률/섭취칼로리/운동칼로리를 얇은 선으로 렌더링한다.
6. `전체 요약`도 선택 기간 기준으로 집계되도록 변경한다.
7. `운동별 퍼포먼스 추이`는 기존 운동 기록의 `calcVolume()`과 추정 1RM(`_topSetE1rm`)을 재사용하며, 표본이 부족하면 `유지중` 또는 `점검필요`로 보수적으로 판정한다.
8. 정적 자산 변경에 맞춰 `sw.js` 캐시 버전을 올리고 테스트를 갱신한다.

### 비범위

- 통계 산식 자체의 의미 변경.
- 사용자 지정 날짜 범위 picker.
- 기존 `종목별 볼륨 추이` 상세 차트의 선택/드릴다운 UX 변경.

## Slice 2 검증

1. `node --check render-stats.js`
2. `node --check sw.js`
3. `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test tests/*.test.js`
6. `git diff --check`
7. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## Slice 2 실행 결과

- 상태: `implemented`
- 변경:
  1. 상단 전체통계 기간 토글에 `이번주`를 추가하고, `이번주`는 월요일부터 오늘까지로 계산한다.
  2. 운동 활성 부위의 내부 `주별/월별` 토글과 건강지표의 내부 기간 토글을 제거했다.
  3. `운동 활성 부위`, `전체 요약`, `운동 분석`, `건강 지표`, `운동별 퍼포먼스 추이`가 모두 `_statsAnalysisRange()`의 동일 기간을 사용한다.
  4. 건강지표는 하나의 `health-metrics-chart` 캔버스에 체중/체지방률/섭취칼로리/운동칼로리를 얇은 정규화 선으로 렌더링하고, 범례와 툴팁에 실제 값을 보여준다.
  5. `종목별 볼륨 추이` 위에 `운동별 퍼포먼스 추이` 카드를 추가했다. 부위별 자주 한 운동을 최대 2개씩 보여주고, 볼륨 추이/추정 1RM 추이/성장중·유지중·점검필요 판정을 표시한다.
  6. 트레이너 통계 모달도 같은 구조와 기간 기준을 사용한다.
  7. `sw.js` 캐시 버전을 `tomatofarm-v20260629z17-stats-week-performance-health`로 올렸다.
  8. 통계/트레이너/캐시 마커 테스트와 신규 `tests/stats-exercise-performance.test.js`를 갱신했다.

## Slice 2 검증 결과

1. PASS: `node --check render-stats.js`
2. PASS: `node --check sw.js`
3. PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js tests/stats-exercise-performance.test.js` — 21 tests passed
4. PASS: `node scripts/verify-runtime-assets.mjs` — refs=860
5. PASS: `node --test tests/*.test.js` — 606 tests passed
6. PASS: `git diff --check`
7. not verified yet: Dashboard3 Pages 배포 검증은 커밋/푸시 후 수행한다.
8. 배포 자산 마커에서 새 cache version, `data-stats-analysis-period="week"`, `health-metrics-chart`, `_renderPeriodScopedStats`를 확인한다.
