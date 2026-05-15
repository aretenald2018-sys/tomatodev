# Max Plan Benchmark Select All Registered

## 요청

`계획 조정`의 `벤치마크 추가`에서 `운동종목 선택` 셀렉트에 랫풀다운 같은 선택 가능한 운동종목이 보이지 않는다. 실제로 선택 가능한 종목은 전부 드러나야 한다.

## 진단 결과

- 직전 수정에서 벤치마크 후보를 활성 기구 `movementIds` 기준으로 너무 강하게 제한했다.
- 그 결과 `getExList()`에는 있고 기존 운동추가/등록 종목으로 선택 가능한 랫풀다운 같은 종목도, 활성 장비 풀에 해당 `movementId`가 없으면 셀렉트 후보에서 빠질 수 있었다.
- 사용자가 기대하는 기준은 “현재 헬스장/공용 범위에서 실제 선택 가능한 등록 운동종목 전체”이고, 활성 기구 풀은 누락 movement 보강과 라벨/출처 표시 용도로만 써야 한다.

## 결정

- 벤치마크 셀렉트는 현재 헬스장 전용 종목과 공용/등록 종목을 모두 노출한다.
- 활성 기구 풀은 등록 종목이 없는 movement fallback을 추가하거나 출처 라벨을 붙이는 데만 사용한다.
- 다른 헬스장 전용 종목은 계속 제외한다.
- 저장값 보존, draft 읽기, 중복 제거 규칙은 유지한다.

## 실행 슬라이스

### Slice 1: 등록 운동종목 전체 노출

- Status: Completed on 2026-05-15.
- Scope:
  - `buildMaxPlanMovementOptionSeeds()`에서 공용/등록 종목은 활성 장비 `movementIds`에 없어도 후보로 포함한다.
  - 현재 헬스장 전용 종목은 포함하고 다른 헬스장 전용 종목은 제외한다.
  - 랫풀다운이 활성 장비 목록에 없어도 등록 종목이면 후보에 남는 회귀 테스트를 추가/수정한다.
  - `STATIC_ASSETS` 대상 변경 시 `sw.js` `CACHE_VERSION`을 범프한다.
- Likely files:
  - `workout/expert/max-cycle-core.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert/max-cycle-render.js`
  - `workout/expert/max.js`
  - `workout/expert.js`
  - `app.js`
  - `tests/calc.max.test.js`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- Do not change:
  - `www/`
  - Firebase 저장 스키마

### Slice 2: 실제 기구명 기반 movement 연결 보정

- Status: Completed on 2026-05-15.
- Trigger:
  - SSOT 전환 이후에도 `벤치마크 추가`에서 랫풀다운이 보이지 않는 재발 사례가 있었다.
  - 원인은 수동/기존 기구 데이터가 `movementIds: []`로 저장된 경우, 실제 기구명 `랫풀다운`을 `lat_pulldown` movement로 연결하지 못한 것이다.
- Scope:
  - 기구 저장 정규화 시 `movementIds`가 비어 있으면 `MOVEMENTS` 이름/id 기준으로 연결 후보를 채운다.
  - 이미 저장된 빈 `movementIds` 기구도 벤치마크 후보 생성 단계에서 같은 추론을 적용한다.
  - `머신`/`핀머신` 같은 한국어 category는 표준 `machine` category로 해석한다.
  - 명시된 `movementIds`가 있으면 저장된 값을 우선하여 사용자/데이터 원천을 덮어쓰지 않는다.
  - 기구 삭제 시 연결 벤치마크 삭제 규칙은 유지한다.
- Files:
  - `data/data-pure.js`
  - `data/data-equipment-pool.js`
  - `workout/expert/max-cycle-core.js`
  - `tests/data.load-save.test.js`
  - `tests/calc.max.test.js`
  - ESM import chain and `sw.js`

### Slice 3: 등록 종목명 기반 movement 연결 보정

- Status: Completed on 2026-05-15.
- Trigger:
  - `벤치마크 추가` 셀렉트에서 여전히 `랫풀다운`이 보이지 않는 실제 화면이 확인됐다.
  - 원인은 등록 종목 레코드에 `name: "랫풀다운"`은 있어도 `movementId`가 없거나 `unknown`이면 후보 생성에서 버려지는 경로였다.
- Scope:
  - 등록 종목 저장 시 `movementId`가 비어 있으면 종목명과 `MOVEMENTS`를 비교해 `movementId`를 복원한다.
  - 로드된 기존 등록 종목도 런타임에서 같은 방식으로 보정한다.
  - 벤치마크 후보 생성도 `ex.movementId`를 직접 신뢰하지 않고 같은 추론 함수를 사용한다.
  - `루마니안 데드리프트`처럼 더 구체적인 이름은 `데드리프트`가 아니라 `rdl`을 선택하도록 매칭 점수를 둔다.
- Files:
  - `data/data-pure.js`
  - `data.js`
  - `data/data-load.js`
  - `workout/expert/max-cycle-core.js`
  - `tests/data.load-save.test.js`
  - `tests/calc.max.test.js`
  - ESM import chain and `sw.js`

### Slice 4: 같은 부위 머신 후보 확장

- Status: Completed on 2026-05-15.
- Trigger:
  - 실제 화면에서 `등 · 파나타 플레이트 하이로우 · 공통 · 머신`은 보이지만 `등 · 랫풀다운`은 여전히 보이지 않았다.
  - 이는 바벨/덤벨/케이블/맨몸은 category fallback을 타는데, 머신은 같은 부위의 머신 등록 종목이 있어도 movement-only 후보 확장을 하지 않는 비대칭 때문이다.
- Scope:
  - 현재 후보에 `machine`/`smith`/`cable` 등록 종목이 있으면 같은 `primary`와 같은 장비 category의 movement-only 후보를 보강한다.
  - `등` 머신 등록 종목이 있으면 `lat_pulldown`이 후보에 포함되는 회귀 테스트를 추가한다.
  - 전체 머신 카탈로그를 무조건 여는 대신 같은 부위/같은 category로 제한한다.
- Files:
  - `workout/expert/max-cycle-core.js`
  - `tests/calc.max.test.js`
  - ESM import chain and `sw.js`

## Verification

- `node --test tests/calc.max.test.js`
- `node --test tests/data.load-save.test.js`
- `node --check data.js`
- `node --check data/data-load.js`
- `node --check data/data-pure.js`
- `node --check workout/expert/max-cycle-core.js`
- `node --check data/data-equipment-pool.js`
- `git diff --check`
- 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 `계획 조정` → `벤치마크 추가` → `연결 종목`에서 랫풀다운 등 등록 종목 노출 확인.

## 실행 결과

- `buildMaxPlanMovementOptionSeeds()`가 현재 헬스장 전용 종목과 공용/등록 종목을 후보로 유지하도록 조정했다.
- 활성 기구 풀은 등록 종목이 없는 movement fallback 및 장비 라벨 보조 용도로만 사용한다.
- 랫풀다운이 활성 장비 목록에 없어도 등록 종목이면 후보에 남는 회귀 테스트를 갱신했다.
- ESM import query를 `20260515v4`로 갱신하고, `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z90-max-cycle-store-sync`로 범프했다.
- Slice 2에서 기구명 `랫풀다운`/`파나타 랫풀다운 머신`처럼 `movementIds`가 비어 있는 실제 기구도 `lat_pulldown`으로 추론해 벤치마크 후보에 포함한다.
- 새 기구 저장 정규화도 같은 추론 함수를 사용해 이후 저장 데이터에는 가능한 `movementIds`를 채운다.
- ESM import query를 `20260515v6`으로 갱신하고, `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z95-benchmark-equipment-name-infer`로 범프했다.
- Slice 3에서 등록 종목 자체의 `movementId`가 비어 있거나 `unknown`이어도 `랫풀다운`/`루마니안 데드리프트` 이름으로 movement를 복원해 벤치마크 후보에 포함한다.
- ESM import query를 `20260515v7`으로 갱신하고, `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z96-benchmark-exercise-name-infer`로 범프했다.
- Slice 4에서 `파나타 플레이트 하이로우`처럼 등/머신 등록 종목이 있으면 같은 등/머신 movement인 `lat_pulldown`도 후보에 포함한다.
- ESM import query를 `20260515v8`으로 갱신하고, `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z97-benchmark-machine-scope-fallback`으로 범프했다.

## Execution Prompt

All planned slices are complete. Review against Slice 1 through Slice 4 only; keep current-gym scoping, draft preservation, saved track persistence, and benchmark dedupe intact.
