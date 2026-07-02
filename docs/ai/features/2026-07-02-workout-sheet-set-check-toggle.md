# 운동 하단 시트 세트 체크 긴급 수정 계획

## 요청

- 증상: 운동 탭 하단 시트의 세트 행 `✓` 체크 버튼이 눌리지 않는다.
- 목표: 개발계와 운영계에 동시에 반영할 수 있게 최소 수정 후 배포한다.

## /diagnose

### 재현 루프

1. 운동 탭에서 오늘 날짜 하단 시트를 `full` 상태로 연다.
2. 헬스 카드에서 `편집하기`를 눌러 세트 행을 편집 상태로 둔다.
3. `KG/REP/RIR/ROM` 값이 있는 미완료 세트의 `✓` 버튼을 누른다.
4. 기대: 해당 행이 즉시 `is-done` 상태로 바뀌고 저장 후에도 유지된다.

### 가설

1. 시트 세트 체크 토글이 `done` 명시값이 아니라 `_isActualWorkoutSet()`을 섞어 판정해 첫 탭이 `false` 저장으로 소비될 수 있다.
2. 편집 행 우측 체크/삭제/그립 타깃이 너무 작아 모바일에서 터치가 빗나갈 수 있다.
3. 인라인 `onclick`만 의존해 시트 내부 재렌더/이벤트 격리와 충돌할 수 있다.

## Slice 1

### 범위

- `render-calendar.js`
- `style.css`
- `tests/workout-calendar-bottom-sheet.test.js`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

### 구현

1. 세트 체크 버튼을 `data-wt-set-done-toggle` 기반으로 렌더하고 시트 내부 capture 핸들러에서 직접 처리한다.
2. 토글 판정은 화면 상태와 일치하도록 `set.done === true`만 완료로 보고 반전한다.
3. 체크/삭제 버튼 모바일 터치 타깃을 넓혀 우측 그립과 겹치지 않게 한다.
4. `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 bump한다.

### 제외

- 운동 데이터 schema 변경
- 세트 입력 UX 재설계
- 종목 북마크/단일 카드 기능 구현
- 러닝/캘린더 다른 화면 수정

### 검증

1. `node --check render-calendar.js`
2. `node --check sw.js`
3. `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-card-layout-css.test.js`
4. `node scripts/verify-runtime-assets.mjs`
5. `git diff --check`
6. 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. 운영계 배포 대상은 원격 확인 후 같은 marker로 검증한다.

## 상태

- 상태: `implemented`
- 현재 세션: Slice 1 정적 검증 및 리뷰 완료, 배포 예정

## 실행 결과

- `render-calendar.js`에서 편집용 세트 행 체크/삭제 버튼을 data-action 기반 직접 바인딩으로 바꿨다.
- `render-calendar.js`에서 시트 체크 토글을 `set.done === true` 기준으로 반전하도록 수정했다.
- `style.css`에서 시트 세트 행 우측 체크/삭제/그립 열을 재배치하고 체크 버튼 터치 타깃을 키웠다.
- `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260702z8-workout-sheet-check-toggle`로 bump했다.
- 리뷰 문서: `docs/ai/reviews/2026-07-02-workout-sheet-set-check-toggle-review.md`
