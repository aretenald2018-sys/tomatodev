# 운동 캘린더 사이클 설정 시트 통합 리뷰

## 리뷰 대상

- `workout/test-v2/board-render.js`
- `test-mode-v2.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache version 참조 테스트들
- `docs/ai/features/2026-06-26-workout-cycle-settings-sheet-unification.md`

## 결과

- 발견 이슈 없음.
- 캘린더 rail 클릭 경로는 `tm2OpenBenchmarkSettings()` 안에서 board overlay를 열거나 `renderBoard()`를 호출하지 않는다.
- 목표 종목 누락 fallback도 온보딩 sheet를 열지 않도록 정리되어 3번 화면이 이 경로에서 나오지 않는다.
- `트랙 구성` 행이 `볼륨`/`강도`/`웬들러` 선택을 함께 소유하고, `운동 방식` 행은 제거되었다.
- 설정 전용 저장 경로에서 `sheet:saved`를 dispatch하므로 저장 후 캘린더 rail 갱신 경로가 유지된다.
- `board-render.js`와 `test-mode-v2.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version bump가 포함되었다.

## 검증

- PASS: `node --check workout/test-v2/board-render.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 53 tests passed
- PASS: `node --test .\tests\*.test.js` — 546 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`

## 남은 확인

- Dashboard3 Pages 배포 후 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 목표 칩 -> 종목 설정 sheet` 실제 UI flow 확인이 필요하다.
