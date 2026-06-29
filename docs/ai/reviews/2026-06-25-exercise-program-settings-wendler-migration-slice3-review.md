# 종목 프로그램 설정 마이그레이션 Slice 3 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md`
- 슬라이스: Slice 3 — 종목 수정 시트에 프로그램 섹션 추가
- 변경 파일:
  - `workout/exercises.js`
  - `style.css`
  - `sw.js`
  - `tests/exercise-program-editor.test.js`
  - cache-version 참조 테스트들

## 발견 사항

- 이슈 없음.

## 검증

- 명령:
  - `node --check workout/exercises.js; node --check workout/test-v2/board-core.js; node --check sw.js`
  - `node --test tests/exercise-program-editor.test.js tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/home-life-zone-npc-quest.test.js tests/workout-active-session-recovery.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
- URL 또는 사용자 흐름:
  - 인증 후 `운동 탭 -> + -> 운동 목록 -> 연필 -> 종목 수정`
- 기대 증거:
  - 프로그램 섹션에서 기본/볼륨/강도/볼륨+강도/웬들러를 선택할 수 있다.
  - 웬들러 선택 시 TM, 시작 주차, 방식, BBB/FSL/없음 등을 저장할 수 있다.
  - 종목 저장 검증 후 `test_board_v2` 프로그램 설정 저장이 실행된다.
- 실제 결과:
  - 정적 검증과 source-level 테스트 통과.
  - 인증 계정 UI flow는 수동 확인 필요.

## 결정

- 통과: 예
- 수정 필요: 없음
- 후속 계획 필요: Slice 4 — picker에서 프로그램 처방을 오늘 운동 카드에 적용

## NEXT_ACTION.md 업데이트

- 리뷰 종료 상태: `ready_for_execution`
- 다음 자동 상태: `ready_for_execution`
- 다음 액션: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md` Slice 4 실행
- 차단 사유: 없음
