# 운동 캘린더 루틴 버튼 제거 및 우측 gutter 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-24-workout-calendar-bottom-sheet.md` 후속 Slice 17
- 변경 파일:
  - `render-calendar.js`
  - `style.css`
  - `sw.js`
  - `tests/workout-calendar-bottom-sheet.test.js`
  - cache marker 참조 테스트들

## 결론

차단 이슈 없음.

## 확인한 계약

- 하단 sheet header action은 `오늘`만 렌더하고 `루틴` 버튼은 제거했다.
- `_openWorkoutHomeRoutine()` 함수와 다른 루틴 진입 경로는 삭제하지 않았다.
- 운동 캘린더 홈 월간 grid는 `--wt-calendar-scroll-gutter`와 `scrollbar-gutter: stable`로 우측 scroll indicator 안전 여백을 확보한다.
- 기존 tap-only `bar`/`full` sheet toggle, full sheet input isolation, floating add action 계약은 유지했다.
- `render-calendar.js`와 `style.css`가 `STATIC_ASSETS`에 포함되므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260627z12-workout-sheet-calendar-gutter`로 bump했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js` — 19 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 553 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`

## 남은 확인

- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 `운동 탭 -> 월간 캘린더 우측 날짜 열 확인`, `하단 sheet header 루틴 버튼 미노출` UI flow 확인이 남아 있다.
