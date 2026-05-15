# ADR: 운동종목 SSOT 전환

## 상태

Accepted and implemented in slices on 2026-05-15.

## 맥락

현재 운동종목 런타임 목록은 `CONFIG.DEFAULT_EXERCISES`와 Firestore `users/{uid}/exercises`를 `loadAll()`에서 합쳐 만든 `_exList`다. 이 구조는 화면에서는 하나의 목록처럼 보이지만, 기본 운동을 삭제해도 다음 로드에서 코드 기본값이 다시 합쳐질 수 있어 영구 데이터 관점의 SSOT가 아니다.

별도로 `MOVEMENTS`는 동작 카탈로그, `equipment_pool`은 기구 카탈로그, `max_cycle`/`expert_preset.maxCycle`은 벤치마크 계획 저장소 역할을 한다. 이들은 서로 다른 도메인이므로 하나의 테이블로 합치면 안 되고, 각 도메인의 SSOT를 명확히 해야 한다.

## 결정

- 운동종목 카탈로그의 SSOT는 Firestore `users/{uid}/exercises`로 둔다.
- `CONFIG.DEFAULT_EXERCISES`는 최초 seed/migration template로만 사용하고, 런타임 목록 생성 시 매번 합치지 않는다.
- `MOVEMENTS`는 운동종목이 아니라 움직임/분류 taxonomy의 SSOT로 유지한다.
- `equipment_pool`은 기구 SSOT로 유지하며, 운동종목을 소유하지 않고 가능한 `movementIds`만 참조한다.
- `max_cycle`은 성장판/벤치마크 계획의 canonical SSOT로 승격한다. `expert_preset.maxCycle`은 legacy migration/fallback으로만 취급하고 신규 쓰기는 중단한다.
- 운동 기록 `workouts/{date}.exercises`는 과거 수행 스냅샷이며 운동종목 카탈로그의 SSOT가 아니다.

## 결과

- 기본 운동 삭제가 다음 로드에서 되살아나는 문제를 막을 수 있다.
- 벤치마크/추천/운동 피커는 같은 `getExList()` 결과를 바라보게 된다.
- 최초 seed, 기존 사용자 migration, 삭제된 운동의 과거 기록 표시, legacy `expert_preset.maxCycle` 처리에 대한 회귀 테스트가 필요하다.

## 비목표

- `MOVEMENTS`와 `exercises`를 하나의 컬렉션으로 합치지 않는다.
- 과거 운동 기록을 운동종목 삭제와 동시에 일괄 삭제하지 않는다. 기록 삭제는 기존 데이터 정리/클렌즈 플로우로만 수행한다.
