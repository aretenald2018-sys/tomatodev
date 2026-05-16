# 테스트모드 운동 후보 SSOT 중복 정리 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-16-max-picker-ssot-dedupe.md`
- 실행 슬라이스:
  - `Slice 1: benchmark 후보 canonical dedupe SSOT화`
  - `Slice 2: 기준 기록과 주차 수행 기록의 의미 분리`
  - `Slice 3: 오늘 운동 화면의 저장 cache/current draft SSOT 통일`
  - `Slice 4: 사이클 전 기준 기록을 W0 시작점으로 표시`
- 변경 파일:
  - `calc.js`
  - `workout/expert/max-cycle-core.js`
  - `workout/expert/max-cycle-render.js`
  - `workout/expert/max-cycle.js`
  - `workout/expert/max-same-day-advice.js`
  - `workout/expert/max.js`
  - `workout/expert/max-benchmark-picker.js`
  - `workout/exercises.js`
  - `workout/index.js`
  - `render-workout.js`
  - `workout/expert.js`
  - `app.js`
  - `build-info.json`
  - `index.html`
  - `sw.js`
  - `tests/calc.max.test.js`

## 발견 사항

- 차단 이슈 없음.
- `max.js`의 로컬 benchmark option dedupe 구현을 제거하고 `max-cycle-core.js`의 `dedupeMaxBenchmarkOptions`/`getMaxBenchmarkOptionGroupKey`를 사용하게 되어 SSOT가 개선됐다.
- 오늘 운동 피커는 `exercise.id` 단독 중복 제거에서 canonical key 기반 중복 제거로 바뀌어, 같은 공통 `movementId` 후보가 하나만 남는다.
- `calc.js`와 `max-cycle-core.js`의 snapshot 의미를 맞춰, 사이클 시작 전 기록은 `baselineLatest`, 사이클 시작 이후 수행은 `latest`로 분리했다.
- 성장판 계단의 `계획 미수행`과 근거 패널의 `기준 볼륨/강도`가 서로 다른 기록 역할을 드러내도록 문구를 수정했다.
- 오늘 운동 화면에서는 저장된 `cache[todayKey]`가 있어도 현재 편집 중인 `S.workout.exercises`를 overlay해 성장판과 운동 편집기가 같은 현재 세션을 보게 했다.
- 성장판 계단은 사이클 시작 전 `baselineLatest`를 W0 기준점으로 표시하되 계획 주차 선택 액션에서는 제외해, 시작점과 W1 이후 수행 여부를 분리한다.
- query version과 `sw.js` `CACHE_VERSION` 갱신이 포함되어 정적 캐시 갱신 조건을 충족한다.

## 검증

- `node --check calc.js pwa-register.js utils/build-info.js workout/expert/max-cycle-core.js workout/expert/max-cycle-render.js workout/expert/max-cycle.js workout/expert/max-same-day-advice.js workout/expert/max.js workout/expert/max-benchmark-picker.js workout/exercises.js workout/index.js render-workout.js workout/expert.js app.js sw.js`
- `node --test tests/calc.max.test.js` 통과: 51개 테스트
- `git diff --check` 통과

## 잔여 리스크

- Codex 세션에서 장기 dev server를 띄우지 않는 프로젝트 규칙 때문에 실제 브라우저 UI 클릭 검증은 아직 not verified yet이다.
- 로컬 일반 터미널에서 `npm.cmd run dev` 실행 후 계획 조정 select, 오늘 운동 선택 모달, W0 기준점 표시를 직접 확인해야 한다.
