# Max 벤치마크 그래프: 주차 내 다중 수행점 표시 리뷰

## 리뷰 대상

- Plan: `docs/ai/features/2026-05-15-max-benchmark-multi-actual-points.md`
- 변경 범위:
  - `workout/expert/max-cycle-render.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert/max-same-day-advice.js`
  - `workout/expert/max.js`
  - `workout/expert.js`
  - `app.js`
  - `index.html`
  - `sw.js`
  - `tests/calc.max.test.js`

## 결과

- 기존 구현은 파란 실제선/점을 표시했지만 주차별 대표 actual 1개만 그래프에 반영했다.
- `_planTrackPoints()`가 주차별 모든 actual을 보존하도록 확장했다.
- `_stairGeometry()`가 각 주차의 모든 actual을 날짜 순서대로 좌표화하고, 같은 주 다중 점은 주차 x축 주변에 분산해 겹침을 줄인다.
- 볼륨/강도 트랙은 기존 `buildBenchmarkActuals({ track })` 필터를 그대로 사용하므로 서로 섞이지 않는다.
- 변경된 JS 정적 자산 import query와 service worker cache version을 갱신했다.

## 검증

- Passed: `node --check workout/expert/max-cycle-render.js`
- Passed: `node --check workout/expert/max-cycle.js`
- Passed: `node --check workout/expert/max-same-day-advice.js`
- Passed: `node --check workout/expert/max.js`
- Passed: `node --check workout/expert.js`
- Passed: `node --check app.js`
- Passed: `node --check sw.js`
- Passed: `node --test tests/calc.max.test.js` (43 tests)
- Passed: `git diff --check`

## 잔여 리스크

- 브라우저 UI 실사용 검증은 아직 수행하지 않았다. 로컬 dev server에서 계획 조정/성장판 미리보기의 실제 SVG 점 표시를 육안 확인해야 한다.
