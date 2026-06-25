# 운동 캘린더 바텀시트 스크롤 분리 Slice 12 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` Slice 12
- 진단: `docs/ai/diagnoses/2026-06-25-workout-calendar-sheet-scroll-lock.md`
- 변경 파일:
  - `app.js`
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 참조 테스트들

## 결과

- 발견한 차단 이슈 없음.

## 확인한 사항

- full sheet 상태에서만 `wt-workout-sheet-scroll-lock`이 켜지고, bar 상태/시트 없음 상태에서는 lock이 해제되는 경로가 있다.
- sheet 내부 `.wt-day-sheet-scroll`의 touch boundary에서 background scroll chaining을 `preventDefault()`/`stopPropagation()`으로 막는다.
- `app.js` 전역 pull-down back listener가 `[data-wt-day-sheet]` 내부 gesture를 선점하지 않는다.
- full 상태 아래 방향 drag는 `WORKOUT_HOME_SHEET_DRAG_HARD_CLOSE_PX` 기준으로 빠르게 `closeLatched`되어 release 시 `bar`로 정착한다.
- `render-calendar.js`, `style.css`, `app.js`는 모두 `STATIC_ASSETS`에 포함되어 있고 `sw.js` cache version이 함께 bump됐다.
- 테스트가 514개로 많은 것은 맞지만, 이번 버그는 전체 테스트를 설계 기준으로 삼지 않고 좁은 scroll ownership 회귀 테스트를 추가하는 쪽이 타당하다. 전체 Node 테스트도 1초 내 통과해 현재 병목은 아니다.

## 검증

- PASS: `node --check app.js; node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: 영향권 테스트 38개
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: 전체 Node 테스트 514개
- PASS: `git diff --check`

## 남은 확인

- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 UI flow 확인 필요.
