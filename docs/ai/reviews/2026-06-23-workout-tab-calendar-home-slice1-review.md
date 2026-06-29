# 운동탭 캘린더 홈 Slice 1 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`
- 실행 범위: Slice 1 — 운동탭 캘린더 홈 진입
- 변경 파일:
  - `index.html`
  - `app.js`
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `docs/ai/features/2026-06-23-workout-tab-calendar-home.md`
  - `docs/ai/NEXT_ACTION.md`

## 결론

치명적 문제는 발견하지 못했다. 운동탭의 기본 진입 surface는 캘린더 홈으로 분리되었고, 날짜 지정 진입은 기존 편집 화면을 유지한다.

## 확인한 내용

- `#tab-workout`에 `#workout-calendar-root`가 추가되어 운동탭 홈 렌더 대상이 생겼다.
- `app.js`에서 운동탭 surface가 `home/edit`으로 나뉘며, 일반 `switchTab('workout')`은 홈 캘린더를 렌더한다.
- `openWorkoutTab(y,m,d)`와 `workoutDate` 옵션은 기존 기록 편집 surface로 들어가므로 기존 추가/수정 흐름을 바로 끊지 않는다.
- `render-calendar.js`의 기존 운동 캘린더 계산을 운동탭 홈에서도 재사용하도록 `renderWorkoutCalendarHome()`과 전용 window handler가 추가되었다.
- `style.css`는 홈 모드에서 기존 날짜 네비/기록 폼을 숨기고, 편집 모드에서는 캘린더 홈 root를 숨긴다.
- `index.html`, `app.js`, `render-calendar.js`, `style.css`는 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`이 bump되었다.

## 검증

- `node --check app.js`
- `node --check render-calendar.js`
- `node --check sw.js`
- `git diff --check`
- 결과: 모두 통과. CRLF 변환 경고만 출력됨.

## not verified yet

브라우저 UI 플로우는 not verified yet이다. 로컬 일반 터미널에서 `npm.cmd run dev` 실행 후 하단 `운동` 탭 클릭, 월 이동, 오늘 이동을 직접 확인해야 한다.

## 잔여 리스크

- `node scripts/verify-runtime-assets.mjs`는 기존 untracked runtime assets가 `sw.js`에 참조되어 실패한다. 이번 Slice 1의 새 파일 누락은 아니다.
- 사용자가 지적한 캘린더 셀/컬러/좌측 주차 레일 디자인은 Slice 2 범위로 남아 있다.
