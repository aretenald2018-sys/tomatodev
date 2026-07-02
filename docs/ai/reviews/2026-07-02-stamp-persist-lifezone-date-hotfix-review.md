# 2026-07-02 완료 도장 유지 및 라이프존 날짜 복구 리뷰

## 리뷰 결과

- Blocking issue 없음.

## 확인한 점

- `saveTestBoardV2`가 Firestore 최신 보드를 읽고, 기존 `paintedAt` 완료 로그를 병합한 뒤 `rethrow: true`로 저장한다.
- 성장 보드 운동 카드와 수동 색칠 경로는 저장 실패 시 도장을 확정하지 않고 로컬 보드를 되돌린다.
- Max 운동 카드의 primary 완료 버튼은 `_setSetDoneState(..., true)`를 호출해 완료 상태를 해제 토글하지 않는다.
- 라이프존 헤더는 `YYYY년 M월 D일`, `오늘의 라이프존`, 이름 목록을 별도 DOM으로 렌더한다.
- `STATIC_ASSETS` 변경에 맞춰 `CACHE_VERSION`을 `tomatofarm-v20260702z20-stamp-persist-lifezone-date`로 올렸다.

## 검증

- `node --check data.js workout/test-v2/board-core.js workout/test-v2/board-render.js workout/exercises.js home/life-zone-state.js home/life-zone.js sw.js`
- `node --test tests/test-v2.board-core.test.js tests/home-life-zone-state.test.js tests/workout-complete-button-binding.test.js tests/workout-save.test.js tests/workout-test-mode-unified.test.js tests/workout-save-mode-guard.test.js`
- `node --test "tests/**/*.test.js"`: 643개 pass.
