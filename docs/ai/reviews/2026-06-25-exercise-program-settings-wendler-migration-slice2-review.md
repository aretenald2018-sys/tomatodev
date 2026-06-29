# 종목 프로그램 설정 마이그레이션 Slice 2 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md`
- 슬라이스: Slice 2 — 프로그램 설정 데이터 계약 확정
- 변경 파일:
  - `workout/test-v2/board-core.js`
  - `tests/test-v2.board-core.test.js`
  - `sw.js`
  - cache-version 참조 테스트들

## 발견 사항

- 이슈 없음.

## 검증

- 명령:
  - `node --check workout/test-v2/board-core.js; node --check sw.js`
  - `node --test tests/test-v2.board-core.test.js`
  - `node --test tests/test-v2.board-core.test.js tests/workout-test-mode-unified.test.js tests/home-life-zone-npc-quest.test.js tests/workout-active-session-recovery.test.js tests/stats-muscle-fatigue-insight.test.js tests/stats-picker-ui-polish.test.js tests/workout-calendar-bottom-sheet.test.js tests/workout-navigation-stack.test.js tests/workout-track-graph-delta.test.js tests/workout-timer-summary-only.test.js`
  - `node scripts/verify-runtime-assets.mjs`
  - `git diff --check`
- URL 또는 사용자 흐름:
  - Slice 2는 순수 데이터 계약이라 UI flow 없음.
- 기대 증거:
  - `exerciseId` 기준 upsert, 웬들러 전환, stair 복귀, 기본 모드 archive 계약이 테스트로 고정된다.
  - `workout/test-v2/board-core.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` cache version이 갱신된다.
- 실제 결과:
  - 모든 정적 검증과 테스트 통과.

## 결정

- 통과: 예
- 수정 필요: 없음
- 후속 계획 필요: Slice 3 — 종목 수정 시트 프로그램 섹션 추가

## NEXT_ACTION.md 업데이트

- 리뷰 종료 상태: `ready_for_execution`
- 다음 자동 상태: `ready_for_execution`
- 다음 액션: `docs/ai/features/2026-06-25-exercise-program-settings-wendler-migration.md` Slice 3 실행
- 차단 사유: 없음
