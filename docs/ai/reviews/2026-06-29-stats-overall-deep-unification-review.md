# 운동 통계 전체/심층 통합 리뷰

## 결론

- 리뷰 결과: `pass`
- 계획 문서: `docs/ai/features/2026-06-29-stats-overall-deep-unification.md`
- 실행 Slice: `Slice 1`

## 확인한 변경

1. `index.html`
   - `전체통계`/`심층통계` 탭과 `#stats-deep-panel`을 제거했다.
   - 전체통계 상단에 `30일`, `90일`, `180일`, `전체` 기간 프리셋과 `#stats-workout-analysis`를 추가했다.
   - 정보 순서를 전체 요약, 운동 분석, 근육 피로도, 건강 지표 비교, 종목별 볼륨 추이로 정리했다.

2. `render-stats.js`
   - `_renderDeepStats()`, `switchStatsView`, `window.switchStatsView` 경로를 제거했다.
   - `_renderWorkoutAnalysis()`로 심층통계의 유효한 운동 분석을 전체통계에 통합했다.
   - 운동 완료 인사이트의 핵심 값인 `계획 이행률`, `계획 대비 볼륨`, `완료 세트`를 선택 기간 기준으로 집계한다.
   - 트레이너 통계 모달도 같은 통계 흐름을 재사용하고 별도 `deep-stats-report`를 렌더하지 않는다.

3. `workout/index.js`
   - `wtEndAndShowInsights()`가 저장 후 `window.insightsOpen(sessionKey)`를 자동 호출하지 않도록 변경했다.
   - 종료 확인 문구와 저장 완료 안내를 통계 탭의 기간별 분석 흐름에 맞췄다.

4. `style.css`, `sw.js`, 테스트
   - `.stats-view-*`, `.deep-*`, `trainer-quest-deep-stats` 스타일을 제거하고 `stats-analysis-*` 스타일을 추가했다.
   - 부위별 운동량/보강 후보는 기존 `근육 피로도` 카드가 담당하도록 두고, `운동 분석`에서는 같은 정보를 별도 카드로 반복하지 않는다.
   - `CACHE_VERSION`을 `tomatofarm-v20260629z9-stats-unified-overall`로 갱신했다.
   - 통계 통합, 심층탭 부재, 완료 인사이트 자동 호출 제거 테스트를 추가/갱신했다.

## 발견 사항

- 중대/높음/중간 이슈: 없음.
- 낮은 리스크: 기존 `workout/expert.js`의 `insightsOpen`과 인사이트 모달 코드는 수동/레거시 호출 호환을 위해 남아 있다. 이번 Slice 범위는 자동 노출 폐지다.
- 낮은 리스크: 실제 통계 탭의 시각 상태는 인증된 배포 환경에서 최종 육안 확인이 필요하다.

## 검증

1. PASS: `node --check render-stats.js`
2. PASS: `node --check workout/index.js`
3. PASS: `node --check sw.js`
4. PASS: `node --test tests/stats-overall-compact-summary.test.js tests/stats-unified-health-chart.test.js tests/stats-muscle-fatigue-insight.test.js tests/trainer-quest-modal.test.js tests/workout-timer-summary-only.test.js` — 24 tests passed
5. PASS: `node --test tests/*.test.js` — 596 tests passed
6. PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=855`
7. PASS: `git diff --check`
8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 794fc9343096a7f26a4f08814fbcded2250e49b5` — `[deploy-verify] ok 794fc9343096 tomatofarm-v20260629z9-stats-unified-overall static=226`
9. PASS: deployed marker fetch — `index.html::stats-workout-analysis`, `render-stats.js::function _renderWorkoutAnalysis`, `render-stats.js::계획 이행률`, `workout/index.js::통계 탭에서 기간별로 확인`, `sw.js::tomatofarm-v20260629z9-stats-unified-overall`

## 남은 검증

- not verified yet: 인증 세션이 없어 실제 `더보기/통계 탭 -> 기간 버튼 -> 운동 분석` UI 클릭 흐름은 인증 계정에서 확인해야 한다.
