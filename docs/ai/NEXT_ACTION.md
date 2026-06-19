# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-19-growth-board-today-selection-reflection.md` (성장 보드 당일 선택 운동 반영 수정)
- 현재 단계: `review complete — Slice 1 완료`
- 마지막 완료: `성장 보드 v2 온보딩/종목관리 후보가 오늘 세션 운동을 병합하도록 연결했고, 그룹 필터의 arm/abs 기본 포함을 제거했다. 세션 entry가 exerciseId만 가져도 등록 운동 부위로 복원하는 회귀 테스트를 추가했고 sw.js CACHE_VERSION을 범프했다.`
- 다음 액션: `없음 — 당일 선택 운동 반영 수정 완료, 실제 브라우저 UI 플로우는 사용자 로컬 dev server에서 수동 확인 필요`
- 차단 사유: `없음`

## 다음 실행 대상

- 완료 파일: `workout/test-v2/board-core.js` · `workout/test-v2/onboarding.js` · `workout/test-v2/board-render.js` · `tests/test-v2.board-core.test.js` · `sw.js` · `docs/ai/features/2026-06-19-growth-board-today-selection-reflection.md` · `docs/ai/reviews/2026-06-19-growth-board-today-selection-reflection-review.md` · `docs/ai/NEXT_ACTION.md`
- 검증 완료:
  1. `node --test tests/test-v2.board-core.test.js`
  2. `node --check workout/test-v2/board-core.js`
  3. `node --check workout/test-v2/onboarding.js`
  4. `node --check workout/test-v2/board-render.js`
  5. `node --check sw.js`
  6. not verified yet: 사용자 상위 지침에 따라 이번 세션에서는 장기 dev server를 시작하지 않아 실제 브라우저 UI 플로우는 미확인

## 보류 중 (이전 흐름)

- `docs/ai/features/2026-06-12-test-mode-simplify-wendler.md` — v1 개편 실행 완료(커밋 2922b64까지), 리뷰 미수행. **v2 구현으로 v1은 동결 상태** — 해당 리뷰는 폐기 권장.

## 상태값

- `idle`: 진행 중인 자동 액션 없음
- `needs_user_decision`: 사용자 결정이 필요함
- `ready_for_execution`: 다음 실행 슬라이스를 바로 진행
- `ready_for_review`: 직전 실행 결과를 바로 리뷰
- `ready_for_fix`: 리뷰에서 발견된 문제만 바로 수정
- `complete`: 현재 계획 완료

## 자동 진행 규칙

- 세션 시작 시 이 파일을 먼저 읽는다.
- 사용자가 "계속", "다음", "진행", "리뷰해", "해줘"처럼 짧게 말하면 이 파일의 `다음 액션`을 실행한다.
- 사용자가 새로운 요청을 명시하면 새 요청이 우선한다. 단, 기존 대기 액션과 충돌하면 어느 흐름을 계속할지 한 번만 확인한다.
- 계획 세션 종료 후 차단 질문이 없으면 `ready_for_execution`으로 갱신한다.
- 실행 세션 종료 후 `ready_for_review`로 갱신한다.
- 리뷰 세션 종료 후 문제가 있으면 `ready_for_fix`, 문제가 없고 다음 슬라이스가 있으면 `ready_for_execution`, 모든 슬라이스가 끝났으면 `complete`로 갱신한다.
- 다음 프롬프트나 리뷰 프롬프트를 사용자에게 복붙하라고 요구하지 않는다. 필요한 프롬프트 내용은 계획 문서와 이 파일에 남기고 에이전트가 직접 읽어 진행한다.
