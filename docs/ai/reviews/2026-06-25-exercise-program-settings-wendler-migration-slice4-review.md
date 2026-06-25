# 종목 프로그램 설정 마이그레이션 Slice 4 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md`
- 슬라이스: Slice 4 — picker에서 프로그램 처방을 오늘 운동 카드에 적용
- 변경 파일:
  - `workout/test-v2/board-core.js`
  - `workout/exercises.js`
  - `sw.js`
  - `tests/test-v2.board-core.test.js`
  - `tests/workout-test-mode-unified.test.js`
  - cache-version 참조 테스트들

## 발견 사항

- 이슈 없음.

## 검증

- 명령:
  - `node --check workout/test-v2/board-core.js; node --check workout/exercises.js; node --check sw.js`
  - `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/exercise-program-editor.test.js`
  - `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/exercise-program-editor.test.js tests/home-life-zone-npc-quest.test.js tests/workout-active-session-recovery.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
- URL 또는 사용자 흐름:
  - 인증 후 `운동 탭 -> + -> 프로그램 설정된 종목 선택`
- 기대 증거:
  - stair 종목은 볼륨/강도 트랙 처방 세트가 생성된다.
  - 웬들러 종목은 준비운동/메인/보조 세트와 `wendlerSignature`가 생성된다.
  - 프로그램 미설정 종목은 기존처럼 1개 빈 세트로 시작한다.
  - 성장보드 색칠/미달 상태는 자동 변경하지 않는다.
- 실제 결과:
  - 정적 검증과 source-level 테스트 통과.
  - 인증 계정 UI flow는 수동 확인 필요.

## 결정

- 통과: 예
- 수정 필요: 없음
- 후속 계획 필요: Slice 5 성장보드 색칠/미달 자동 반영은 사용자 결정 후 별도 계획

## NEXT_ACTION.md 업데이트

- 리뷰 종료 상태: `complete`
- 다음 자동 상태: `complete`
- 다음 액션: 성장보드 색칠 통합 방식 사용자 결정 대기
- 차단 사유: Slice 5 정책 미정
