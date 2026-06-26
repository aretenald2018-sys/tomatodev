# 운동 사이클 설정 시트 정리 및 클릭 닫힘 수정 리뷰

## 리뷰 대상

- `workout/test-v2/board-render.js`
- `test-mode-v2.css`
- `sw.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- cache version 참조 테스트들
- `docs/ai/features/2026-06-26-workout-cycle-settings-sheet-polish.md`

## 결과

- 발견 이슈 없음.
- 웬들러 모드에서는 기본 계단 전용 `세트 수`, `6주 성공 시 증량` 입력이 렌더되지 않는다.
- `자세 메모`, `헬스장별 기구` 입력 행은 제거되었고, 저장 시 기존 메타 값은 입력 부재만으로 삭제되지 않는다.
- `현재 사이클`은 웬들러 행과 볼륨/강도 행을 함께 만들 수 있다.
- sheet 내부 click handler가 `event.stopPropagation()`을 호출하므로 cycle rail 클릭이 backdrop close와 분리된다.
- `board-render.js`와 `test-mode-v2.css`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version bump가 포함되었다.

## 검증

- PASS: `node --check workout/test-v2/board-render.js; node --check sw.js`
- PASS: `node --test tests/workout-calendar-bottom-sheet.test.js tests/test-v2.board-core.test.js` — 53 tests passed
- PASS: `node --test .\tests\*.test.js` — 546 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=835`
- PASS: `git diff --check`

## 남은 확인

- Dashboard3 Pages 배포 후 인증 계정으로 `운동 탭 -> 월간 캘린더 -> 좌측 cycle rail 목표 칩 -> 종목 설정 sheet -> 현재 사이클 탭/스크롤` 실제 UI flow 확인이 필요하다.
