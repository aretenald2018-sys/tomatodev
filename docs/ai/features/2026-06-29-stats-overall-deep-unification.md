# 운동 통계 전체/심층 통합 계획

## 상태

- 상태: `complete`
- 작성일: `2026-06-29`
- 자동 트리거: `/diagnose`
- 사용자 요청: 전체통계와 심층통계를 중복 없이 전체통계 하나로 통합하고, 심층통계 탭과 운동 완료 후 통계성 알림모달을 폐지한다. 운동 완료 모달의 통계성 정보는 기간 설정 가능한 통계 화면 안으로 흡수한다.

## /diagnose

1. `index.html`에는 아직 `.stats-view-tabs` 아래 `전체통계`/`심층통계` 버튼이 둘 다 있고, `#stats-deep-panel`도 남아 있다.
2. `render-stats.js`는 `renderStats()`에서 `_bindStatsViewTabs()`와 `_renderDeepStats(root)`를 계속 호출한다.
3. `render-stats.js`의 `switchStatsView('deep')`와 `window.switchStatsView`가 심층통계 탭 모델을 유지한다.
4. 트레이너 통계 모달도 `_trainerQuestStatsMarkup()`에서 `trainer-quest-deep-stats`와 `deep-stats-report`를 별도 섹션으로 렌더한다.
5. 운동 종료 플로우는 `workout/index.js`의 `wtEndAndShowInsights()`가 저장 후 `window.insightsOpen(sessionKey)`를 호출한다. 이 모달은 `workout/expert.js`의 `_renderMaxInsight()`에서 `계획 이행률`, `계획 대비 볼륨`, `완료 세트` 등 통계성 정보를 보여준다.
6. 기존 개선은 전체 요약/건강 차트/중복 카드 일부 제거에 그쳤고, 사용자가 요구한 “심층통계 탭 폐지”와 “운동 완료 통계 모달 폐지”는 완료되지 않았다.

## 그릴 결과

- 질문: 심층통계 정보를 완전히 버릴지, 전체통계 안에 선별 통합할지?
- 코드 기준 결정: 버리지 않고 전체통계 안의 `운동 분석` 블록으로 흡수한다. 단, 이미 `근육 피로도`, `건강 지표 비교`, `종목별 볼륨 추이`가 제공하는 정보는 반복하지 않는다.
- 질문: 기간 설정은 자유 입력까지 필요한지, 먼저 프리셋 기간으로 충분한지?
- 코드 기준 결정: Slice 1은 기존 통계 UI와 맞춰 `30일`, `90일`, `180일`, `전체` 프리셋을 제공한다. 자유 날짜 범위는 별도 Slice로 분리한다.
- 질문: 운동 완료 전 확인 모달도 제거할지?
- 코드 기준 결정: 실수 방지용 종료 확인은 유지하고, 저장 후 자동으로 뜨는 통계성 인사이트 모달만 폐지한다.

## 목표

1. 통계 탭에는 `전체통계`/`심층통계` 탭 선택 UI가 없어야 한다.
2. 심층통계의 유효한 정보는 전체통계 안에서 중복 없이 한 흐름으로 배치한다.
3. 전체통계에는 화면 전체에 적용되는 운동 분석 기간 프리셋이 있어야 한다.
4. 운동 완료 후 자동 통계/인사이트 모달은 뜨지 않아야 한다.
5. 운동 완료 모달에서 보던 `계획 이행률`, `계획 대비 볼륨`, `완료 세트`, 다음 제안 성격의 정보는 통계 화면의 기간 기반 집계 안에서 확인할 수 있어야 한다.

## 정보 배치 원칙

1. 최상단: 기간 선택 + 전체 요약
2. 다음: `운동 분석` 카드
   - 선택 기간 기준 운동일, 유효세트, 주당 세트, 평균 RPE
   - max/test-mode 기록이 있으면 계획 이행률, 계획 대비 볼륨, 완료 세트
   - 최근 절반 vs 이전 절반 변화량
   - 한 줄 코치 제안
3. 다음: 근육 피로도
   - 부위별 운동량/보강 후보는 여기에서만 보여 중복 제거
4. 다음: 건강 지표 비교
   - 체중/체지방/섭취/소모 흐름은 여기에서만 보여 중복 제거
5. 다음: 종목별 볼륨 추이
   - 종목 추세는 여기에서만 보여 중복 제거

## 실행 범위

### Slice 1. 통계 단일화와 완료 인사이트 폐지

1. `index.html`
   - `.stats-view-tabs`, `#stats-deep-panel` 제거.
   - 전체통계 패널을 단일 통계 루트로 유지.
   - 전체통계 상단에 기간 프리셋 컨트롤과 `stats-workout-analysis` 컨테이너 추가.

2. `render-stats.js`
   - `switchStatsView`, `_bindStatsViewTabs`, `window.switchStatsView` 제거 또는 no-op 폐기.
   - `_renderDeepStats()`를 별도 탭 렌더러가 아닌 `_renderWorkoutAnalysis()`로 재구성.
   - `_analyzeTrainerWindow()`를 선택 기간 기반으로 재사용하고, 완료 인사이트의 `_maxInsightStats()`와 같은 성격의 집계 값을 통계 화면에 제공한다.
   - 트레이너 통계 모달도 동일한 단일 통계 흐름을 재사용하고 `trainer-quest-deep-stats`를 렌더하지 않는다.

3. `workout/index.js`
   - `wtEndAndShowInsights()`에서 저장 후 `window.insightsOpen(sessionKey)` 자동 호출 제거.
   - 종료 확인 문구에서 “이번 주 인사이트” 표현 제거.
   - 저장 완료 후 통계 탭에서 확인하라는 toast 수준의 안내만 남긴다.

4. `style.css`
   - `.stats-view-*`, `.deep-*`, 별도 deep tab 스타일 제거.
   - 기간 컨트롤과 `stats-workout-analysis` 카드 스타일 추가.

5. `sw.js`
   - `index.html`, `render-stats.js`, `style.css`, `workout/index.js`가 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION` bump.

6. 테스트
   - 심층통계 탭/패널/`switchStatsView`/`trainer-quest-deep-stats`가 없음을 검증.
   - 전체통계에 기간 프리셋과 `stats-workout-analysis`가 있음을 검증.
   - 운동 종료 플로우가 `insightsOpen`을 자동 호출하지 않음을 검증.
   - cache marker 테스트 갱신.

## 제외 범위

- 자유 날짜 범위 picker.
- 통계 탭 전체 비주얼 리디자인.
- 기존 `workout/expert.js` 인사이트 모달 코드의 완전 삭제. Slice 1에서는 자동 노출만 폐지하고, 남은 수동/레거시 호출 제거는 별도 Slice로 분리한다.
- 통계 데이터를 Firestore에 새로 저장하는 구조 변경.

## 검증

1. `node --check render-stats.js; node --check workout/index.js; node --check sw.js`
2. `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/trainer-quest-modal.test.js tests/workout-timer-summary-only.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test`
5. `git diff --check`
6. `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. 배포 마커 확인:
   - `index.html::stats-workout-analysis`
   - `render-stats.js::_renderWorkoutAnalysis`
   - `workout/index.js::통계 탭에서 기간별로 확인`
   - `sw.js::<new cache marker>`

## 실행 결과

- 리뷰 문서: `docs/ai/reviews/2026-06-29-stats-overall-deep-unification-review.md`
- 구현:
  1. `전체통계`/`심층통계` 탭과 deep panel을 제거했다.
  2. 전체통계 안에 기간 프리셋과 `운동 분석` 블록을 추가했다.
  3. `_renderDeepStats()` 대신 `_renderWorkoutAnalysis()`를 사용하고, 테스트모드 완료 인사이트의 `계획 이행률`, `계획 대비 볼륨`, `완료 세트`를 기간 집계로 흡수했다.
  4. 운동 종료 저장 후 `insightsOpen` 자동 호출을 제거했다.
  5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260629z9-stats-unified-overall`로 갱신했다.
- 검증:
  1. PASS: `node --check render-stats.js`
  2. PASS: `node --check workout/index.js`
  3. PASS: `node --check sw.js`
  4. PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js tests/workout-timer-summary-only.test.js` — 24 tests passed
  5. PASS: `node --test tests/*.test.js` — 596 tests passed
  6. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
  7. PASS: `git diff --check`
- 남은 검증:
  1. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 794fc9343096a7f26a4f08814fbcded2250e49b5` — `[deploy-verify] ok 794fc9343096 tomatofarm-v20260629z9-stats-unified-overall static=226`
  2. PASS: deployed marker fetch — `index.html`, `render-stats.js`, `workout/index.js`, `sw.js` 모두 HTTP 200 및 새 통계 통합 marker 확인.
  3. not verified yet: 인증 계정에서 실제 통계 탭 기간 버튼/운동 분석 UI flow 확인.

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-06-29-stats-overall-deep-unification.md`의 Slice 1을 실행한다.
