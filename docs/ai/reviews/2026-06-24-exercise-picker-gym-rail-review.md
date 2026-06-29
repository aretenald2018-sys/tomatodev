# 운동 피커 헬스장 rail 필터 리뷰

## 대상

- 계획: `docs/ai/features/2026-06-24-exercise-picker-gym-rail.md`
- 구현 커밋: `61ae70388677` (`feat: add gym rail filtering to exercise picker`)
- 변경 파일:
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-picker-gym-rail.test.js`
  - `tests/workout-test-mode-unified.test.js`
  - `docs/ai/NEXT_ACTION.md`
  - `docs/ai/features/2026-06-24-exercise-picker-gym-rail.md`

## 결과

- 블로킹 이슈: 없음.

## 확인 내용

- `_renderPickerCategory()`의 왼쪽 rail에서 `data-picker-summary="all/custom"` 하드코딩과 기존 `기구 관리` 조건부 버튼이 제거됐다.
- rail은 `전체`와 `ctx.gyms` 기반 `data-picker-gym` 칩, `data-picker-action="manage-gyms"` 관리 칩으로 렌더된다.
- rail gym 선택은 `_wtSetPickerGymCategoryFilter()`로 category 화면에 머물며 `_pickerGymFilter`를 갱신한다.
- `_openPickerList()`, back, 분류 탭, 부위 탭, 부위 타일 경로가 `preserveGymScope`를 사용해 선택 gym scope를 유지한다.
- `_isExerciseUsableAtGym()`/`_applyPickerGymScope()`가 특정 gym scope에서 공통 종목도 함께 포함한다.
- `헬스장 관리`는 `_selectedPickerManagerGymId()`를 통해 선택 rail gym을 우선으로 `openMaxEquipmentPoolModal({ gymId })`를 호출한다.
- `style.css`는 긴 헬스장명 칩이 줄바꿈 가능하도록 보강됐고 active 상태가 추가됐다.
- `sw.js` `CACHE_VERSION`은 `tomatofarm-v20260624z24-picker-gym-rail`로 bump됐다.

## 검증

- PASS: `node --check workout/exercises.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-picker-gym-rail.test.js tests/workout-test-mode-unified.test.js`
- PASS: `node --test tests/*.test.js` — 476개 통과
- PASS: `npm.cmd run verify:assets`
- PASS: `git diff --check`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 61ae703`
- PASS: 배포된 `workout/exercises.js`, `style.css`, `sw.js`에서 `data-picker-gym`, `data-picker-action="manage-gyms"`, `preserveGymScope`, `tomatofarm-v20260624z24-picker-gym-rail` 마커 확인.

## 남은 리스크

- not verified yet: 인증된 사용자 세션으로 `운동 탭 -> + -> 분류 rail에서 헬스장 선택 -> 부위 선택 -> 목록 확인 -> 헬스장 관리` 실제 클릭 흐름은 실행하지 못했다. 배포 자산과 커밋은 검증됐지만, 로그인 뒤 UI 조작 검증은 사용자 계정 세션에서 확인해야 한다.
