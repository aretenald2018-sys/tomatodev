# 운동통계 카드 우선순위와 건강지표 곡선 정리 계획

## 상태

- 상태: `complete`
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
