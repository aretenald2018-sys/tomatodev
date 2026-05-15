# Max Plan Benchmark Equipment List Sync

## 요청

`계획 조정`에서 `벤치마크 추가` 또는 `연결 종목` 선택 시 보이는 운동 목록이 실제 등록/활성화된 운동기구 목록과 달라 사용자가 기대한 기구를 벤치마크로 연결하기 어렵다.

## 진단 결과

- 증상: 계획 조정의 벤치마크 후보는 `workout/expert/max.js`의 `_movementsForPlanEditor()`가 만든 목록을 사용한다.
- 확인된 원인:
  - `_movementsForPlanEditor()`는 현재 `getExList()` 기반 후보만 만들고, 맥스 기구 관리의 활성 장비 풀(`getActiveEquipmentForGym`)을 기준으로 후보를 제한/보강하지 않는다.
  - 그래서 실제 기구 관리에서 켜거나 끈 공통 모듈, 현재 헬스장 전용 기구, 기존 등록 종목의 gym scope가 벤치마크 후보와 어긋날 수 있다.
  - `벤치마크 추가`는 이 후보를 그대로 사용하므로 새 벤치마크 추가 시 목록 차이가 곧 사용자-visible 버그가 된다.
- 원인 가설:
  - H1: 활성 장비 풀을 무시해 꺼진 공통 모듈 또는 다른 범위 종목이 후보에 남는다.
  - H2: 활성 장비 풀에 있는 movement가 `getExList()`에 없으면 후보에서 빠진다.
  - H3: 계획 조정 중 현재 헬스장 선택/상태가 후보 생성에 일관되게 반영되지 않는다.

## 결정

- 벤치마크 후보의 기준을 현재 맥스 헬스장의 활성 장비/등록 종목과 맞춘다.
- 활성 장비 풀에 movement가 있으면 그 movement에 대응하는 실제 `exerciseId`를 우선 사용한다.
- 기록 기반 기본값, 중복 제거, 현재 부위 탭 우선 추가, unsaved draft 보존 동작은 유지한다.
- 기구/운동 카탈로그 자체와 Firebase 저장 스키마는 바꾸지 않는다.

## 실행 슬라이스

### Slice 1: 계획 조정 벤치마크 후보와 실제 기구 목록 동기화

- Status: Implemented on 2026-05-15.
- Scope:
  - `_movementsForPlanEditor()` 후보 생성에서 현재 헬스장 기준 활성 장비 풀을 반영한다.
  - `벤치마크 추가`와 `연결 종목` 셀렉트가 같은 후보 목록을 사용하게 유지한다.
  - 회귀 테스트를 추가해 활성 장비 밖 종목이 셀렉트에 섞이지 않는지 검증한다.
  - `STATIC_ASSETS` 대상 파일 변경 시 `sw.js` `CACHE_VERSION`을 범프한다.
- Likely files:
  - `workout/expert/max.js`
  - `workout/expert/max-cycle-render.js`
  - `tests/calc.max.test.js`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- Do not change:
  - `www/` 산출물.
  - Firebase/data 저장 스키마.
  - 운동 카탈로그(`config.js`)의 movement 정의.
  - 계획 조정의 다른 계단/트랙 편집 동작.
- Verification:
  - `node --test tests/calc.max.test.js`
  - `git diff --check`
  - 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 운동 탭에서 `계획 조정` → `벤치마크 추가` → `연결 종목` 목록이 실제 등록/활성화된 기구와 맞는지 확인.

## Execution Prompt

Read this plan and implement Slice 1 only. Preserve current draft-reading behavior before re-rendering the plan editor, keep benchmark option dedupe rules intact, and bump `sw.js` `CACHE_VERSION` if any `STATIC_ASSETS` file changes.

## 실행 결과

- `workout/expert/max.js`의 계획 조정 벤치마크 후보 생성이 현재 맥스 헬스장의 `getActiveEquipmentForGym()` 결과와 현재 헬스장 등록 종목을 함께 반영하도록 변경했다.
- `workout/expert/max-cycle-core.js`에 후보 seed 생성 순수 헬퍼를 추가해 활성 공통 장비, 현재 헬스장 전용 종목, 활성 장비 movement fallback을 같은 규칙으로 만들게 했다.
- `벤치마크 추가`는 현재 선택된 부위 탭 안에서 아직 쓰지 않은 후보를 먼저 추가하며, 추가 전 DOM draft 값을 읽어 기존 미저장 값 보존을 유지한다.
- 변경된 정적 자산 import query와 `sw.js` `CACHE_VERSION`을 함께 갱신했다.
- 검증:
  - `node --test tests/calc.max.test.js` 통과, 34개 테스트 모두 pass.
  - `git diff --check` 통과, Git의 기존 LF/CRLF 경고만 표시됨.

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-05-15-max-plan-benchmark-equipment-list-sync-review.md`
- 결정: 통과.
- 리뷰 중 `movement:` fallback 옵션의 기본값 적용 경계값을 보강했고, 재검증 통과.
