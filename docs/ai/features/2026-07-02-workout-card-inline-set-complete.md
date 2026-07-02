# 운동 카드 인라인 세트 추가와 종목완료

## 요청

- 운동 세트 행 아래에 항상 비어 있는 `+` 행을 둔다.
- `+` 행을 누르면 해당 운동 종목에 세트를 추가한다.
- 카드 하단의 `세트 추가`, `편집 완료`, `카드 접기` 칩을 없애고 `종목완료` 버튼 하나만 둔다.
- `종목완료`를 누르면 해당 종목 기록을 확정 저장하고, 붉은 `완료` 도장이 45도 각도로 찍히는 이펙트를 보여준다.

## /grill-me

1. 현재 하단 시트 운동 카드의 세트 변경은 이미 `saveDay()`로 즉시 저장된다. 따라서 `종목완료`는 새 schema를 만들기보다 세트들을 완료 상태로 정리하고, 카드 완료 상태/도장 이펙트를 렌더링하는 확정 액션으로 정의한다.
2. 기존 `세트 추가` 버튼은 footer에 있어 손이 아래로 내려간다. 요구대로 세트 리스트 마지막에 add row를 넣으면 세트 입력 흐름과 추가 행동이 같은 시각 영역에 모인다.
3. `카드 접기` 자체를 없애라는 요구가 있으므로 `종목완료` 후에도 카드를 강제로 접지 않는다. 대신 확정 저장 직후 붉은 도장 이펙트로 결과를 보여준다.

## Slice 1

### 범위

- `render-calendar.js`
- `style.css`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache marker 테스트들
- `sw.js`
- `docs/ai/NEXT_ACTION.md`
- 리뷰 문서

### 구현

1. `_renderWorkoutSetRows()`가 세트 행 렌더 후 `wt-max-set-add-row` 버튼을 항상 마지막에 렌더한다.
2. add row는 기존 `_wtCalAddExerciseSet()` 경로를 사용하되, 추가 후 해당 카드가 editing 상태가 되도록 한다.
3. `_renderWorkoutExerciseDetailCard()` footer는 `종목완료` 하나만 렌더하고, `편집 완료`/`세트 추가`/`카드 접기`/`편집하기` footer 버튼을 제거한다.
4. `_completeWorkoutExerciseFromSheet()`를 추가해 해당 종목의 실제 입력 세트를 완료 처리하고 저장한 뒤 도장 이펙트를 표시한다.
5. 붉은 `완료` 도장 이펙트 CSS를 추가한다.
6. `render-calendar.js`, `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 운동 picker 플로우 변경
- 러닝 카드 UX 변경
- Firestore schema 변경
- 일반 운동 탭 카드(`workout/exercises.js`) 변경
- 세트 타입/웬들러 역할 산식 변경

### 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `node --test --test-reporter=dot @testFiles`
6. `git diff --check`
7. 운영계 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`
8. Dashboard3는 Pages backend lock이 풀리면 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 상태

- 상태: `complete`
- 현재 세션: Slice 1 구현, 리뷰, 운영계/Dashboard3 Pages 배포 검증 완료

## 실행 결과

1. 펼쳐진 운동 카드는 세트 행을 항상 바로 입력 가능한 상태로 렌더한다.
2. 세트 리스트 마지막에 `wt-max-set-add-row` `+` 버튼을 추가해 해당 종목에 빈 세트를 추가한다.
3. 카드 footer를 `종목완료` 단일 버튼으로 변경하고 `편집 완료`/`세트 추가`/`카드 접기`/`편집하기` 버튼 렌더를 제거했다.
4. `종목완료`는 값이 있는 세트를 완료 처리해 저장하고 `완료` 도장 이펙트를 표시한다.
5. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z17-workout-card-inline-complete`로 bump했다.
6. 구현 커밋 `b14455671f14a4d077bfa0b53238aa7e38cdf693`를 `origin/main`과 `tomatofarm/main`에 push했다.
7. Dashboard3/운영계 Pages에서 z17 cache marker와 `wt-max-set-add-row`, `window._wtCalCompleteExercise`, `wt-max-complete-stamp` marker를 확인했다.
