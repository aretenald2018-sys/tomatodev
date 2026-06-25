# 운동 캘린더 바텀시트 드래그 최종 좌표 수정 리뷰

## 범위

- 진단: `docs/ai/diagnoses/2026-06-25-workout-calendar-sheet-drag-final-dy.md`
- 구현: `render-calendar.js`, `sw.js`
- 테스트: `tests/workout-calendar-bottom-sheet.test.js` 및 cache marker 참조 테스트

## 원인

기존 drag release는 `pointermove`에서 갱신된 `lastDragY`만 사용했다. 빠른 스와이프에서는 최종 이동량이 `pointerup.clientY`에만 남을 수 있어, 실제로는 충분히 위로 밀었는데 snap 판정에서는 `dy=0` 또는 작은 값으로 처리됐다.

## 변경

1. `pointerup`/`pointercancel`에서 최종 `clientY`로 `finalDy`를 다시 계산한다.
2. `finalDy`로 `openLatched`/`closeLatched`를 release 직전에 한 번 더 갱신한다.
3. `pointermove` 리스너를 `{ passive: false }`로 바꾸고 이동 중 `preventDefault()`를 호출한다.
4. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260625z48-workout-sheet-drag-final-dy`로 갱신했다.

## 검증

- PASS: `node --check render-calendar.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js`
- PASS: `node --test .\tests\*.test.js` — 513 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 리스크

- 인증 계정이 필요한 실제 모바일 터치 드래그는 배포 후 수동 확인이 필요하다.
- 이번 수정은 최종 좌표 누락 문제를 해결한다. 만약 사용자가 화살표가 아닌 본문/바 영역을 드래그하는 흐름까지 요구하면 hit area 정책을 별도 변경해야 한다.
