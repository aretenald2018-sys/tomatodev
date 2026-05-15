# Max Plan Benchmark Major Tabs Review

## 리뷰 대상

- Plan: `docs/ai/features/2026-05-15-max-plan-benchmark-major-tabs.md`
- Files:
  - `workout/expert/max-cycle-render.js`
  - `workout/expert/max.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert.js`
  - `app.js`
  - `tests/calc.max.test.js`
  - `sw.js`

## 결과

- Findings: 없음.
- 확인 내용:
  - `renderMaxPlanEditor()`가 `MAJOR_LABEL` 기반 전체 큰 부위 탭을 항상 렌더링한다.
  - 저장된 벤치마크가 없는 부위도 빈 패널을 렌더링한다.
  - `addMaxBenchmarkEditorRow()`가 먼저 DOM 값을 `_draftMaxPlanEditorCycle()`로 읽어 unsaved draft를 보존한 뒤, 현재 켜진 부위 탭 기준으로 후보를 고른다.
  - lazy module query version과 `sw.js` `CACHE_VERSION`이 함께 갱신됐다.
  - 회귀 테스트가 사용자가 본 누락 케이스에서 `등`, `이두`, `둔부` 탭/빈 패널 노출을 검증한다.

## 검증

- `node --test tests/calc.max.test.js` 통과: 33 tests, 33 pass.
- `git diff --check` 통과.
- UI 브라우저 검증은 아직 수행하지 않았다. 사용자가 로컬 터미널에서 dev server를 실행한 뒤 운동 탭의 `계획 조정` 모달 흐름을 확인해야 한다.
