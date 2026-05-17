# 테스트모드 전체 헬스장 등록 카탈로그 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-05-17-max-picker-regular-catalog-ssot.md`
- 슬라이스: `Slice 3: 테스트모드 전체 등록 카탈로그의 헬스장 scope 필터 제거`
- 변경 핵심:
  - `workout/expert/max-benchmark-picker.js`
  - `tests/calc.max.test.js`
  - ESM query 갱신 파일과 `sw.js`

## 결과

- 발견된 차단 이슈 없음.
- `includeAllRegisteredExercises` 전용 경로에서만 current gym 필터를 건너뛰도록 제한되어 있다.
- 기본 resolver 호출은 기존 current gym scope와 canonical dedupe를 유지한다.
- 스샷 케이스처럼 현재 테스트모드 헬스장과 다른 헬스장 전용 등록 종목도 일반모드 카탈로그 SSOT에 맞춰 보존된다.
- 순수 fixture에서 `바벨 컬`, `암컬`, `케이블`이 모두 결과에 남는 것을 확인했다.

## 검증

- `node --check workout/expert/max-benchmark-picker.js workout/exercises.js workout/index.js workout/load.js workout/expert.js workout/expert/max.js render-workout.js app.js sw.js`
- `node --test tests/calc.max.test.js`
- `git diff --check`

## 남은 검증

- UI 실사용 검증은 프로젝트 규칙상 장기 dev server를 이 세션에서 띄우지 않아 `not verified yet`.
- 로컬 터미널에서 `npm.cmd run dev` 후 테스트모드 → 운동종목 추가 → 이두 필터에서 `바벨 컬`, `암컬`, `케이블`이 함께 보이는지 확인해야 한다.
