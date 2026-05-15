# Max Cycle Store Sync

## 요청

계획 조정/성장판 저장 데이터가 `expert_preset.maxCycle`과 별도 `max_cycle` 설정에 나뉘어 저장되며, 한쪽에서 삭제되거나 갱신되면 다른 한쪽도 같은 상태가 되도록 맞춘다.
또한 운동종목/기구 삭제 후 벤치마크에 삭제된 연결이 남아 `등록 종목 없음`처럼 보이는 상태를 제거한다.

## 진단 결과

- 읽기 경로는 두 저장소 중 최신/보존 점수가 높은 값을 고르도록 보강되어 있었다.
- 쓰기 경로는 `saveMaxCycle()`과 `saveExpertPreset({ maxCycle })`가 서로 다른 설정 문서만 저장할 수 있어, 저장/삭제 후 두 문서가 다시 갈라질 수 있었다.

## 결정

- `saveExpertPreset()`에 `maxCycle` patch가 들어오면 `expert_preset.maxCycle`과 `max_cycle`을 같은 값으로 저장한다.
- `saveMaxCycle()`도 별도 `max_cycle`뿐 아니라 `expert_preset.maxCycle`을 같은 값으로 저장한다.
- 삭제는 `null`을 동일하게 저장해 양쪽 모두 삭제 상태가 되게 한다.
- 두 저장소에는 같은 `updatedAt` 값을 넣어 이후 읽기 선택이 흔들리지 않게 한다.
- 운동종목 삭제 시 해당 `exerciseId`를 참조하는 성장판 벤치마크도 제거한다.
- 계획 조정에서 기구 풀로 생성된 벤치마크는 `equipmentPoolId`를 저장하고, 기구 삭제 시 연결 벤치마크도 제거한다.

## 실행 슬라이스

### Slice 1: 저장/삭제 양방향 동기화

- Status: Completed on 2026-05-15.
- Scope:
  - `data.js`의 `saveExpertPreset()` / `saveMaxCycle()` 저장 규칙 동기화.
  - `workout/expert/max.js`의 성장판 저장 wrapper를 단일 저장 API로 정리.
  - 운동종목/기구 삭제 시 연결 벤치마크를 함께 정리.
  - 정적 파일 변경에 따른 ESM query 및 service worker cache version 갱신.

## Verification

- `node --test tests/calc.max.test.js`
- `node --check data.js`
- `node --check workout/expert/max.js`
- `git diff --check`
- 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 계획 조정 저장/삭제 흐름에서 새로고침 후 값 유지 확인.
