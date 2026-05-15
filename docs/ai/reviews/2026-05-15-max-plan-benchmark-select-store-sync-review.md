# Max Plan Benchmark Select + Store Sync Review

## 리뷰 대상

- 계획 문서:
  - `docs/ai/features/2026-05-15-max-plan-benchmark-select-all-registered.md`
  - `docs/ai/features/2026-05-15-max-cycle-store-sync.md`
- 변경 파일:
  - `data.js`
  - `app.js`
  - `sw.js`
  - `workout/expert.js`
  - `workout/expert/max.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert/max-cycle-core.js`
  - `workout/expert/max-cycle-render.js`
  - `tests/calc.max.test.js`

## 결과

- Blocker: 없음.
- `buildMaxPlanMovementOptionSeeds()`는 다른 헬스장 전용 종목을 제외하면서, 현재 헬스장/공용 등록 종목은 활성 장비 목록과 무관하게 후보로 남긴다.
- `saveExpertPreset({ maxCycle })`와 `saveMaxCycle()`은 저장/삭제 모두 `expert_preset.maxCycle`과 `max_cycle`을 같은 값으로 갱신한다.
- 계획 조정 저장 경로의 이중 저장 호출을 제거해 같은 저장 API를 타도록 정리했다.
- 운동종목 삭제 시 해당 `exerciseId`를 참조하는 성장판 벤치마크도 제거한다.
- 기구 풀 기반 벤치마크는 `equipmentPoolId`를 보존하고, 해당 기구 삭제 시 연결 벤치마크도 제거한다.

## 검증

- `node --test tests/calc.max.test.js`
- `node --check data.js`
- `node --check workout/expert/max.js`
- `git diff --check`
- 브라우저 UI 검증은 sandbox에서 장기 dev server를 띄우지 않는 프로젝트 규칙 때문에 아직 미실행이다. 로컬 터미널에서 `npm.cmd run dev` 후 확인한다.

## 잔여 리스크

- 기존 원격 Firestore에 이미 서로 다른 값이 남아 있는 경우, 첫 저장 전까지는 읽기 선택 로직이 최신 값을 고른다. 이후 저장/삭제부터 두 저장소가 같은 상태로 맞춰진다.
