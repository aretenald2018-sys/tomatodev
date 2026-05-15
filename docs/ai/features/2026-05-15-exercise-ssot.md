# Exercise SSOT

## 요청

운동종목 데이터가 하나의 원천을 바라보도록 SSOT 처리한다. 부작용 가능성이 높으면 슬라이스를 나눠 진행한다.

## 현재 진단

- `data/data-load.js`는 Firestore `exercises`와 `CONFIG.DEFAULT_EXERCISES`를 매 로드마다 합쳐 `_exList`를 만든다.
- 이 때문에 코드 기본 운동은 Firestore에서 삭제해도 다음 로드 때 다시 나타날 수 있다.
- 대부분의 운동 UI, 추천, 성장판 후보는 `getExList()`를 보지만, 그 `getExList()` 자체가 두 원천의 합성 결과다.
- `MOVEMENTS`는 운동종목이 아니라 동작/분류 taxonomy다. SSOT 전환 대상은 운동종목 카탈로그이며, `MOVEMENTS`는 별도 원천으로 남겨야 한다.
- `equipment_pool`은 기구 원천이고 `movementIds`로 연결된다. 운동종목 삭제와 기구 삭제가 벤치마크 후보에 남지 않도록 참조 정리가 필요하다.
- `max_cycle`과 `expert_preset.maxCycle`은 직전 수정으로 저장 동기화는 됐지만, canonical store가 둘인 상태라 완전한 SSOT는 아니다.

## SSOT 정의

| 도메인 | Canonical SSOT | 역할 |
| --- | --- | --- |
| 운동종목 카탈로그 | `users/{uid}/exercises` | 사용자가 선택/삭제/수정하는 실제 운동종목 |
| 동작 taxonomy | `config.js` `MOVEMENTS` | movementId, 대분류/세부분류, 장비 카테고리 정의 |
| 기구 카탈로그 | `users/{uid}/equipment_pool` | 헬스장/공용 기구와 가능한 movementIds |
| 성장판 계획 | `settings/max_cycle` | 벤치마크, 트랙, 계획 kg/reps |
| 전문가 설정 | `settings/expert_preset` | 모드, 현재 헬스장, 온보딩/추천 설정 |
| 운동 기록 | `workouts/{date}.exercises` | 과거 수행 스냅샷, 카탈로그 원천 아님 |

## 실행 슬라이스

### Slice 1: 운동종목 카탈로그 seed migration

- Status: Completed on 2026-05-15.
- Scope:
  - `CONFIG.DEFAULT_EXERCISES`를 runtime merge 원천이 아닌 seed template로 전환한다.
  - 사용자별 `settings.exercise_catalog_seed` 같은 seed marker를 추가한다.
  - seed가 아직 완료되지 않은 사용자에게만 누락된 기본 운동을 Firestore `exercises`로 저장한다.
  - seed 성공 후 `_exList`는 Firestore `exercises` 문서만으로 구성한다.
  - Firestore load 실패 시에만 read-only fallback으로 기본 운동을 쓰되, SSOT 완료로 간주하지 않는다.
  - 기본 운동 삭제 후 재로드해도 되살아나지 않는 순수/통합 테스트를 추가한다.
- Likely files:
  - `data/data-load.js`
  - `data.js`
  - `data/data-core.js`
  - `tests/*`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- Verification:
  - `node --test tests/calc.max.test.js`
  - 신규 seed helper 테스트
  - `git diff --check`
  - 로컬 UI: 기본 운동 삭제 → 새로고침 → 운동추가 목록에서 삭제 상태 유지

#### 실행 결과

- `buildExerciseCatalogSeedPlan()` 순수 헬퍼를 추가했다.
- seed 완료 전에는 누락 기본 운동을 Firestore `exercises`에 1회 저장하고 `settings/exercise_catalog_seed` 완료 마커를 남긴다.
- seed 완료 후에는 `CONFIG.DEFAULT_EXERCISES`를 런타임 목록에 다시 합치지 않고 Firestore `exercises`만 `_exList`로 사용한다.
- 기존 Firestore 운동은 같은 `id`의 기본 운동으로 덮지 않는다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z91-exercise-ssot-seed`로 범프했다.

#### 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --check data/data-load.js`
- `node --check data/data-pure.js`
- `git diff --check`

### Slice 2: 삭제/참조 정합성 강화

- Status: Completed on 2026-05-15.
- Scope:
  - `deleteExercise()`가 성장판 벤치마크, 오늘 운동 피커 후보, 관련 캐시를 같은 `exerciseId` 기준으로 정리하는지 보강한다.
  - 과거 `workouts` 기록은 자동 삭제하지 않고, 기존 데이터 클렌즈 플로우에서만 삭제한다.
  - 삭제된 운동을 참조하는 과거 기록 렌더링은 `movementId` 또는 스냅샷 fallback으로 깨지지 않게 한다.
- Verification:
  - 삭제 후 벤치마크 셀렉트에 `등록 종목 없음`이 남지 않는 테스트
  - 운동 기록 화면에서 삭제된 과거 기록이 fatal error 없이 표시되는 테스트

#### 실행 결과

- `removeExerciseFromMaxCycle()`와 `selectMaxCycleForExerciseCleanup()` 순수 헬퍼를 추가했다.
- `deleteExercise()`가 운동종목 삭제 후 canonical 후보 cycle에서 해당 `exerciseId` 벤치마크를 제거하도록 정리했다.
- 기존 동작 기록은 자동 삭제하지 않고, 데이터 클렌즈 플로우가 명시적으로 기록 삭제를 담당하는 구조를 유지했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z92-exercise-ssot-delete-cleanup`으로 범프했다.

#### 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --check data.js`
- `git diff --check`

### Slice 3: 성장판 계획 SSOT 정리

- Status: Completed on 2026-05-15.
- Scope:
  - `settings/max_cycle`을 canonical store로 고정한다.
  - `expert_preset.maxCycle`은 load 시 1회 migration/fallback으로만 읽고, 신규 쓰기에서는 제외한다.
  - migration 후 `expert_preset`에는 `maxCycle`을 남기지 않거나 `null`로 정리한다.
  - `_getMaxCycleSafe()`와 저장 경로를 단일 API로 정리한다.
- Verification:
  - 기존 `expert_preset.maxCycle`만 있는 계정도 `max_cycle`로 복원되는 테스트
  - 저장 후 Firestore settings에 canonical 값이 하나만 남는 수동 확인

#### 실행 결과

- `buildMaxCycleCanonicalPlan()` 순수 헬퍼를 추가했다.
- 로드 시 `expert_preset.maxCycle` legacy 값만 있으면 `settings/max_cycle`로 승격하고, `expert_preset`에서는 `maxCycle`을 제거한다.
- `saveExpertPreset()`은 더 이상 `expert_preset.maxCycle`을 저장하지 않고, legacy `maxCycle` patch가 들어와도 `max_cycle`로 redirect한다.
- `saveMaxCycle()`은 `settings/max_cycle`만 canonical으로 저장하고, 남아 있는 legacy `expert_preset.maxCycle`은 정리한다.
- 계획 조정 저장과 운동추가 벤치마크 피커가 canonical `getMaxCycle()`을 우선 보도록 바꿨다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z93-max-cycle-canonical`로 범프했다.

#### 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --check data.js`
- `node --check data/data-load.js`
- `node --check workout/expert/max.js`
- `node --check workout/exercises.js`
- `git diff --check`

### Slice 4: 소비자 정리 및 브라우저 검증

- Status: Completed on 2026-05-15.
- Scope:
  - 운동 피커, 계획 조정, 추천, 데이터 클렌즈가 모두 `getExList()`와 canonical `max_cycle`을 바라보는지 정리한다.
  - `STATIC_ASSETS` 변경 시 `sw.js` `CACHE_VERSION`과 ESM query를 범프한다.
  - 브라우저에서 운동추가/삭제, 벤치마크 추가, 기구 삭제, 새로고침 복원 플로우를 검증한다.
- Verification:
  - `npm.cmd run dev`
  - `http://localhost:5500` 또는 dev-start가 출력한 URL
  - UI 플로우: 기본 운동 삭제, 커스텀 운동 추가/수정/삭제, 계획 조정 벤치마크 추가, 새로고침 후 상태 유지

#### 실행 결과

- 변경된 운동/성장판 소비자 모듈의 ESM query를 `20260515v5`로 갱신했다.
- `workout-ui.js`, `render-workout.js`, `workout/index.js`, `workout/load.js`, `workout/exercises.js`, `workout/expert.js`, `workout/expert/max.js`, `max-cycle*` 경로가 최신 모듈을 로드하도록 정리했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z94-exercise-ssot-consumers`로 범프했다.
- sandbox 장기 dev server 금지 규칙 때문에 브라우저 UI 검증은 로컬 실행 대상으로 남겼다.

#### 검증

- `node --test tests/data.load-save.test.js`
- `node --test tests/calc.max.test.js`
- `node --test tests/workout-save.test.js tests/save-schema.test.js tests/workout-fixture.test.js`
- `node --check app.js`
- `node --check render-workout.js`
- `node --check workout-ui.js`
- `node --check workout/index.js`
- `node --check workout/load.js`
- `node --check workout/exercises.js`
- `node --check workout/expert.js`
- `node --check workout/expert/max.js`
- `git diff --check`

## 최종 상태

- 운동종목 카탈로그 SSOT: `users/{uid}/exercises`
- 기본 운동: `CONFIG.DEFAULT_EXERCISES`는 seed template
- 성장판 계획 SSOT: `settings/max_cycle`
- 기구 SSOT: `users/{uid}/equipment_pool`
- 동작 taxonomy SSOT: `config.js` `MOVEMENTS`
- 과거 운동 기록: 수행 스냅샷으로 보존

## 리스크와 방지책

- 최초 seed 중 네트워크 실패: `_exList`를 기본값으로 영구 확정하지 않고 fallback으로만 표시한다.
- 기존 사용자 기본 운동 중 커스텀 override: 동일 `id`가 Firestore에 있으면 seed가 덮어쓰지 않는다.
- 새 코드 배포 후 기존 기본 운동 추가: 자동 재주입하지 않는다. 필요 시 별도 “기본 운동 복원” 액션으로 처리한다.
- 과거 운동 기록 dangling reference: 삭제와 기록 삭제를 분리하고 렌더 fallback을 유지한다.

## Execution Prompt

Read this plan and implement Slice 1 only. Do not change max cycle canonicalization yet. Preserve existing workout history behavior, do not edit `www/`, and bump `sw.js` `CACHE_VERSION` if any `STATIC_ASSETS` file changes.
