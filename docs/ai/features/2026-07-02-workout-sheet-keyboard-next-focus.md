# 운동 하단 시트 키보드 다음 포커스 긴급 수정 계획

## 요청

- 증상: 하단 시트에서 세트를 추가한 뒤 `KG` 입력 후 모바일 키보드의 `다음`을 누르면 커서가 `REP`로 갔다가 바로 `KG`로 되돌아간다.
- 목표: 입력 저장 후 재렌더가 새 포커스 위치를 덮어쓰지 않도록 고치고 개발계/운영계에 긴급 배포한다.

## /diagnose

### 재현 루프

1. 운동 탭에서 오늘 날짜 하단 시트를 연다.
2. 헬스 카드에서 세트를 추가한다.
3. 새 세트의 `KG` 칸에 값을 입력한다.
4. 모바일 키보드의 `다음`을 눌러 `REP` 칸으로 이동한다.
5. 기대: 저장/재렌더 후에도 커서가 `REP` 칸에 남아 있어야 한다.

### 가설

1. `KG` input의 `change` 저장이 늦게 실행될 때, 이미 `document.activeElement`는 `REP`인데 저장 옵션의 `sourceInput`은 여전히 `KG`라 복원 대상이 뒤로 돌아간다.
2. `_captureWorkoutSheetInputState()`가 현재 포커스보다 `sourceInput`을 우선해 iOS 키보드 `다음` 흐름을 역행한다.
3. 재렌더 후 포커스 복원 자체는 필요하므로 기능을 제거하면 기존 iOS 스크롤 튐 회귀가 생길 수 있다.

## Slice 1

### 범위

- `render-calendar.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

### 구현

1. `_captureWorkoutSheetInputState()`에서 현재 `document.activeElement`가 세트 input이면 그것을 우선 복원한다.
2. 현재 포커스가 세트 input이 아닐 때만 기존 `sourceInput` fallback을 사용해 blur/save 복원 동작을 유지한다.
3. 키보드 `다음` 회귀를 잡는 소스 테스트를 추가한다.
4. `render-calendar.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 세트 입력 UI 재설계
- 저장 schema 변경
- `workout/exercises.js` 일반 운동 카드 입력 흐름 수정
- 날짜/운동 종목 추가 플로우 변경

### 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test --test-reporter=dot tests/*.test.js`
6. `git diff --check`
7. 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
8. 운영계 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

## 상태

- 상태: `reviewed_static_verified_deploy_pending`
- 현재 세션: Slice 1 구현/정적 검증/리뷰 완료, 개발계/운영계 배포 대기

## 실행 결과

- `render-calendar.js`의 `_captureWorkoutSheetInputState()`가 현재 `document.activeElement`가 세트 input이면 해당 input을 우선 캡처하도록 변경했다.
- 현재 포커스가 세트 input이 아닐 때는 기존처럼 `sourceInput`을 fallback으로 사용해 blur/save 복원을 유지했다.
- `tests/workout-calendar-bottom-sheet.test.js`에 현재 포커스 우선/`sourceInput` fallback 회귀 테스트를 추가했다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z9-workout-sheet-next-focus`로 bump하고 cache marker 테스트를 갱신했다.
- PASS: `node --check render-calendar.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js`
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- 리뷰 문서: `docs/ai/reviews/2026-07-02-workout-sheet-keyboard-next-focus-review.md`
