# 운동 기록 화면 스크롤 회귀 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-30-workout-record-scroll-regression.md`
- 변경 파일:
  - `app.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-navigation-stack.test.js`
  - cache-version marker 테스트들

## 결과

- 발견된 차단 이슈 없음.

## 확인한 사항

- 기록/상세 본문에서 시작한 touch gesture는 전역 workout pull-back의 `preventDefault()` 경로에 들어가지 않는다.
- 일반 캘린더 home/month 영역의 기존 pull-back 및 day sheet scroll surface 예외는 유지됐다.
- 기록 화면 본문에는 모바일 세로 pan 허용과 WebView 스크롤 힌트가 추가됐다.
- 하단 타이머 바가 열린 상태에서 마지막 카드/메모가 바 아래로 가려지지 않도록 padding-bottom 여유가 추가됐다.
- `app.js`와 `style.css`는 `STATIC_ASSETS` 대상이며, `sw.js` cache version bump가 포함됐다.

## 검증

- PASS: `node --check app.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/workout-navigation-stack.test.js tests/workout-card-layout-css.test.js` — 10 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=863`
- PASS: `node --test --test-reporter=dot tests/*.test.js`
- PASS: `git diff --check`
- PASS: Dashboard3 Pages 배포 검증 — `ce243d72f73d`, `tomatofarm-v20260630z07-workout-record-scroll`
- PASS: Dashboard3 Pages marker 직접 fetch — `sw.js` cache version, `app.js`의 `_isWorkoutRecordScrollTarget`/`_workoutPageScrollTop`, `style.css`의 `touch-action: pan-y`/timer-open padding marker 확인

## 남은 위험

- not verified yet: 인증 계정이 없어 실제 Dashboard3 운동 기록 화면에서 터치 스크롤이 복구된 상태는 직접 조작 확인하지 못했다.
