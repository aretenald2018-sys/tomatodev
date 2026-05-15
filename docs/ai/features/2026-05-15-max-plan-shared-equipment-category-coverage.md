# Max Plan Shared Equipment Category Coverage

## 요청

`계획 조정`에서 기존 벤치마크인 `루마니안 데드리프트`가 갑자기 `등록 종목 없음`처럼 표시된다.

## 진단 결과

- `루마니안 데드리프트`의 movement id는 `rdl`이고, `config.js`상 `equipment_category`는 `barbell`이다.
- 직전 변경에서 계획 조정 후보를 활성 기구 기준으로 좁혔다.
- 기본 공통 기구 `올림픽 바벨`의 `movementIds`에는 `deadlift`는 있지만 `rdl`이 없어서, 활성 바벨이 있어도 `rdl` 후보가 빠졌다.
- 렌더러는 기존 벤치마크의 `exerciseId`/`movementId`를 현재 후보에서 찾지 못하면 `현재 운동추가 목록에서 찾을 수 없습니다` 상태를 보여준다.

## 결정

- 바벨, 덤벨, 맨몸, 케이블처럼 하나의 실제 기구가 여러 catalog movement를 대표하는 공통 카테고리는 `movementIds` 명시 목록뿐 아니라 `equipment_category` 기준으로도 후보를 열어준다.
- 머신/스미스처럼 특정 기구와 movement 연결이 중요한 카테고리는 기존처럼 명시 `movementIds`를 우선한다.
- 기존 활성/비활성 기구 필터, 현재 헬스장 scope, 중복 제거 규칙은 유지한다.

## 실행 슬라이스

### Slice 1: shared equipment category 후보 보강

- Status: Implemented on 2026-05-15.
- Scope:
  - `buildMaxPlanMovementOptionSeeds()`의 활성 기구 movement 매핑에서 shared category fallback을 지원한다.
  - `rdl`이 활성 `barbell` 기구 아래 후보로 유지되는 회귀 테스트를 추가한다.
  - 변경 대상이 `STATIC_ASSETS`이면 `sw.js` `CACHE_VERSION`을 범프한다.
- Likely files:
  - `workout/expert/max-cycle-core.js`
  - `tests/calc.max.test.js`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`
- Do not change:
  - `www/`
  - Firebase 저장 스키마
  - 운동 catalog 자체의 movement 정의

## Verification

- `node --test tests/calc.max.test.js`
- `git diff --check`
- 사용자 로컬 터미널에서 `npm.cmd run dev` 실행 후 `계획 조정`에서 `루마니안 데드리프트` 벤치마크가 등록 종목 없음으로 표시되지 않는지 확인.

## Execution Prompt

Read this plan and implement Slice 1 only. Preserve active equipment filtering, current gym scope, and benchmark dedupe behavior. Bump `sw.js` `CACHE_VERSION` if a static asset changes.

## 실행 결과

- `workout/expert/max-cycle-core.js`에서 활성 기구 매핑에 category fallback을 추가했다.
- `barbell`, `dumbbell`, `bodyweight`, `cable` 활성 기구는 명시 `movementIds`에 없더라도 같은 `equipment_category`의 이미 등록된 운동을 후보로 살린다.
- 단, category fallback만으로는 등록되지 않은 movement-only 후보를 새로 만들지 않는다. movement-only fallback은 명시 `movementIds`에 있는 항목만 유지한다.
- `tests/calc.max.test.js`에 `rdl` 회귀 케이스를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260515z88-max-plan-shared-equipment-category`로 범프했다.
- 검증:
  - `node --test tests/calc.max.test.js` 통과, 34개 테스트 모두 pass.
  - `git diff --check` 통과, Git의 기존 LF/CRLF 경고만 표시됨.

## 리뷰 결과

- 리뷰 문서: `docs/ai/reviews/2026-05-15-max-plan-shared-equipment-category-coverage-review.md`
- 결정: 통과.
- 최초 구현에서 category fallback이 등록되지 않은 movement-only 후보까지 만들 수 있던 점을 테스트로 확인했고, 등록된 운동만 category fallback으로 살리도록 보강했다.
