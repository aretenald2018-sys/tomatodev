# 테스트모드 피커 데이터 배지 회귀 수정

## 요청

Discord `devreq_discord_1511552359229296770`에서 테스트모드 종목 선택 모달이 데이터가 있는 종목에도 `데이터 없음`을 표시하는 이슈가 보고됐다.

## 진단 결과

- 첨부 스크린샷에서 `케이블 크런치`, `행잉 레그 레이즈`처럼 이미 선택된 종목(`✓`)에도 `데이터 없음` 배지가 보인다.
- 코드 확인 결과 `workout/exercises.js`의 `_renderMaxBenchmarkPickerMeta()`가 `__maxBenchmark`가 없는 후보를 모두 `데이터 없음`으로 렌더링한다.
- `resolveMaxBenchmarkPickerItems()`는 벤치마크가 아닌 추가 후보에도 실제 수행 이력을 조회할 수 있는 `cache`, `exList`, `todayKey`를 이미 받지만, 해당 이력을 후보 item에 싣지 않는다.
- 현재 편집 중인 오늘 세트는 아직 저장 전일 수 있으므로 피커 렌더 시 `S.workout.exercises`도 함께 확인해야 한다.

## 가설

1. 벤치마크가 아닌 후보의 최근 수행 이력을 item에 전달하지 않아 이력이 있어도 `데이터 없음`으로 표시된다.
2. 오늘 이미 추가한 종목은 `S.workout.exercises`에 세트 데이터가 있어도 메타 렌더가 이를 보지 않는다.
3. 벤치마크 후보는 기존 계획 배지 표시가 맞으므로 이 경로는 유지해야 한다.

## Slice 1: 테스트모드 피커 데이터 배지 판정 보정

수정 대상:

- `workout/expert/max-benchmark-picker.js`
  - 벤치마크가 아닌 등록 후보에도 최근 수행 이력을 계산해 `latest`로 싣는다.
- `workout/exercises.js`
  - 피커 resolver에 오늘 편집 중인 운동 세트를 반영한 cache를 넘긴다.
  - `__maxBenchmark`가 없어도 오늘 세트 또는 최근 이력이 있으면 `오늘/최근 · kg x reps` 배지를 표시한다.
  - 실제 표시할 세트/이력이 없을 때만 `데이터 없음`을 표시한다.
- `tests/calc.max.test.js`
  - 벤치마크가 아닌 피커 후보도 최근 이력을 보존하는 회귀 테스트를 추가한다.
- `sw.js`
  - `STATIC_ASSETS`에 포함된 파일 수정에 맞춰 `CACHE_VERSION`을 bump한다.

하지 않을 것:

- `www/` 직접 수정.
- 피커 CRUD/기구 관리 기능 변경.
- 운동 기록 데이터 마이그레이션.
- 새 프레임워크나 빌드 도입.

검증:

- `git diff --check`
- `node --check workout/exercises.js`
- `node --check workout/expert/max-benchmark-picker.js`
- `node --check sw.js`
- `node --test tests/calc.max.test.js`
- 실제 UI 검증은 프로젝트 규칙상 Codex 세션에서 장기 dev server를 시작하지 않으므로 사용자 로컬 터미널에서 `npm.cmd run dev` 후 `운동 탭 -> 테스트모드 -> 종목 추가` 모달에서 수행한다.

## 실행 결과

- `workout/expert/max-benchmark-picker.js`: 벤치마크가 아닌 피커 후보도 `cache`에서 최신 표시용 세트 데이터를 찾아 `latest`로 전달한다. `kg=0`이어도 `reps>0`이면 데이터로 인정해 복부/맨몸 계열 기록을 놓치지 않게 했다.
- `workout/exercises.js`: 피커 resolver에 오늘 편집 중인 `S.workout.exercises`를 반영한 cache를 넘긴다. 벤치마크가 없는 후보는 오늘 세트가 있으면 `오늘 · nkg x n회` 또는 `오늘 · n회`, 최근 이력이 있으면 `최근 · ...`, 둘 다 없을 때만 `데이터 없음`을 표시한다.
- `tests/calc.max.test.js`: 벤치마크가 아닌 `플랭크` 후보가 `0kg/45회` 최근 데이터를 보존하는 회귀 테스트를 추가했다.
- `sw.js`: `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260603-test-mode-picker-data-badge`로 bump했다.

## 실행 검증

- PASS: `git diff --check`
- PASS: `node --check workout/exercises.js`
- PASS: `node --check workout/expert/max-benchmark-picker.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/calc.max.test.js` (`55` tests)
- PASS: `node --test tests/*.test.js` (`374` tests)
- not verified yet: 실제 모바일 UI 클릭 플로우는 프로젝트 규칙상 Codex 세션에서 장기 dev server를 시작하지 않아 수행하지 않았다.
