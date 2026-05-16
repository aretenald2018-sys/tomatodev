# 테스트모드 운동 후보 SSOT 중복 정리 계획

## 배경

- 사용자 제보: 테스트모드 운동 선택 모달과 성장판 계획 조정의 종목 선택 select에 같은 운동이 여러 번 노출된다.
- 증상 1: 계획 조정 select에서 `덤벨 벤치프레스`가 `활성 공통`/`공통` 등 서로 다른 출처 라벨로 중복 표시된다.
- 증상 2: 오늘 운동 선택 모달에서 같은 `movementId`의 등록 운동이 여러 개 보인다.
- 이전 수정은 `movementId` 누락 후보를 복원하는 데 초점이 있었고, 후보의 canonical identity를 두 화면에서 통일하지 못했다.

## /diagnose

### 재현 루프

- 단위 테스트로 `renderMaxPlanEditor` option HTML과 `resolveMaxBenchmarkPickerItems` 결과를 확인한다.
- 기존 회귀 테스트 `tests/calc.max.test.js`에 사용자가 올린 화면과 같은 중복 조건을 추가한다.

### 가설

1. `workout/expert/max.js`와 `workout/expert/max-cycle-core.js`에 유사한 benchmark option dedupe 로직이 중복되어 SSOT가 깨졌다.
2. `buildMaxPlanMovementOptionSeeds`가 운동 등록본과 활성 기구 fallback을 모두 seed로 만들고, 이후 label/source 차이 때문에 하나로 접히지 않는다.
3. `resolveMaxBenchmarkPickerItems`는 `exercise.id` 기준으로만 `seen` 처리해 같은 `movementId`의 다른 등록본을 중복 노출한다.
4. 공통 바벨/덤벨/맨몸은 `movementId`, 머신/케이블/스미스는 `gym scope + movementId`로 접어야 하지만 일부 경로는 이 규칙을 공유하지 않는다.

## 목표

- plan editor와 오늘 운동 피커가 같은 canonical dedupe 규칙을 사용한다.
- 공통 바벨/덤벨/맨몸 후보는 `movementId` 단위로 하나만 보인다.
- 머신/케이블/스미스 후보는 현재 헬스장 scope와 `movementId` 단위로 하나만 보인다.
- 중복 후보 중 최근 benchmark 데이터가 강한 대표를 선택한다.
- 선택/저장 시 기존 `exerciseId`, `movementId`, track 값 보존을 깨뜨리지 않는다.

## 실행 슬라이스

### Slice 1: benchmark 후보 canonical dedupe SSOT화

- 상태: 완료
- 실행 결과: plan editor와 오늘 운동 피커가 `workout/expert/max-cycle-core.js`의 canonical dedupe helper를 공유하도록 변경했다.
- 검증 결과: `node --check`, `node --test tests/calc.max.test.js`, `git diff --check` 통과.

- `workout/expert/max-cycle-core.js`에 canonical option key/rank/dedupe 규칙을 확정한다.
- `workout/expert/max.js`의 로컬 dedupe 중복 구현을 core export 사용으로 치환한다.
- `workout/expert/max-benchmark-picker.js`도 같은 key/rank 규칙으로 benchmark/exercise 후보를 dedupe한다.
- 필요한 import query와 `sw.js` `CACHE_VERSION`을 갱신한다.
- `tests/calc.max.test.js`에 plan editor select와 오늘 피커 중복 회귀 테스트를 추가한다.

### Slice 2: 기준 기록과 주차 수행 기록의 의미 분리

- 상태: 완료
- 문제: 성장판 계단 UI는 주차 내 수행 여부를 보고 `미수행`이라 표시하지만, 상세/근거 UI는 사이클 시작 전 기준 기록을 `직전 볼륨`으로 보여준다. 현재 snapshot의 `latest`도 사이클 시작 전 기록을 포함할 수 있어 SSOT 의미가 섞인다.
- 실행 결과: `calc.js`와 `workout/expert/max-cycle-core.js` 모두 사이클 시작 전 기록을 `baselineLatest`로 분리했고, `latest`/`onPlan`/`completed`는 사이클 시작 이후 수행만 보도록 맞췄다. 성장판 주차 상태는 `계획 미수행`, 벤치마크 근거는 `기준 볼륨/강도`로 표시한다.
- 검증 결과: `node --check`, `node --test tests/calc.max.test.js`, `git diff --check` 통과.
- 실행:
  - `buildMaxCycleSnapshot`에서 사이클 시작일 이전 기록은 `baselineLatest`로 분리하고, `latest`/`onPlan`/`completed`는 사이클 시작 이후 주차 수행 기록만 사용한다.
  - 성장판 계단의 `미수행` 문구를 `계획 미수행`처럼 주차 계획 기준임을 드러내게 바꾼다.
  - 성장판 근거 문구의 `직전 볼륨/강도`는 `기준 볼륨/강도`로 바꿔 사이클 시작 전 기준 기록임을 명확히 한다.
  - 회귀 테스트를 추가한다.

### Slice 3: 오늘 운동 화면의 저장 cache/current draft SSOT 통일

- 상태: 완료
- 문제: `renderMaxCard`는 오늘 cache가 있으면 `S.workout.exercises`의 현재 편집 중 세트를 덮어보지 않는다. 그래서 운동 편집기에는 오늘 세트가 있는데 성장판 미리보기는 저장된 cache만 보고 `계획 미수행`처럼 보일 수 있다.
- 실행 결과: 오늘 화면에서 성장판/추천/미리보기용 cache를 만들 때 `S.workout.exercises`를 `cache[todayKey].exercises`에 overlay하도록 변경했다. 저장된 오늘 기록이 이미 있어도 현재 편집 중인 세트가 우선한다.
- 검증 결과: `node --check`, `node --test tests/calc.max.test.js`, `git diff --check` 통과.
- 실행:
  - 오늘 화면용 cache를 만들 때 항상 `S.workout.exercises`를 `cache[todayKey].exercises`에 overlay한다.
  - 이 overlay를 순수 helper로 두고 테스트한다.
  - query version과 `sw.js` `CACHE_VERSION`을 갱신한다.

### Slice 4: 사이클 전 기준 기록을 W0 시작점으로 표시

- 상태: 완료
- 문제: W1이 `계획 미수행`이어도 카드 하단에는 사이클 시작 전 기준 기록이 보여 같은 주차의 수행 기록처럼 읽힐 수 있다.
- 목표: 사이클 시작 전 `baselineLatest`를 계단 그래프의 W0 기준점으로 표시해, W1 이후 주차 수행 여부와 시작 기준 기록을 같은 SSOT에서 시각적으로 분리한다.
- 실행 결과: 성장판 계단에 현재 트랙의 `baselineLatest`를 W0 기준점으로 추가했다. W0은 날짜/중량/반복과 `기준` 상태만 표시하고 계획 주차 선택 액션에서는 제외된다.
- 검증 결과: `node --check`, `node --test tests/calc.max.test.js`, `git diff --check` 통과.
- 실행:
  - 성장판 계단 렌더러가 `baselineLatest`를 현재 트랙의 W0 기준점으로 삽입한다.
  - W0은 계획 선택 액션 대상에서 제외하고 `기준` 날짜/중량/반복만 보여준다.
  - 회귀 테스트와 query version, `sw.js` `CACHE_VERSION`을 갱신한다.

## 제외

- UX 문구/디자인 변경은 하지 않는다.
- 기구 관리 데이터 모델이나 Firestore 저장 구조는 변경하지 않는다.
- 배포는 사용자가 다시 명시적으로 요청할 때만 진행한다.

## 검증

- `node --check pwa-register.js utils/build-info.js workout/expert/max-cycle-core.js workout/expert/max-cycle-render.js workout/expert/max-cycle.js workout/expert/max.js workout/expert/max-benchmark-picker.js workout/exercises.js workout/index.js render-workout.js app.js sw.js`
- `node --test tests/calc.max.test.js`
- `git diff --check`
- UI 검증은 로컬 일반 터미널에서 `npm.cmd run dev` 실행 후:
  - 테스트모드 → 계획 조정 → 벤치마크 종목 select에서 같은 공통 운동이 1개만 보이는지 확인
  - 테스트모드 → 오늘 운동 선택 모달에서 같은 `movementId` 후보가 1개만 보이는지 확인
  - 테스트모드 → 성장판 미리보기에서 사이클 전 기준 기록이 W0으로 표시되고 W1 미수행과 분리되는지 확인

## 다음 세션 시작 프롬프트

새 요청을 기준으로 `docs/ai/NEXT_ACTION.md`를 확인하고 다음 계획을 작성한다.
