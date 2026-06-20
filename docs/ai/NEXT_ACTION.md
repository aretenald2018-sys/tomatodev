# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-20-growth-board-day-exercise-add.md` (성장 보드 날짜별 운동 추가 열)
- 현재 단계: `review complete — Slice 1 완료`
- 마지막 완료: `성장 보드 오른쪽 마지막 열에 날짜별 + 셀과 운동 선택 시트를 추가했고, 현재 주차 선택은 오늘 운동 엔트리에도 반영되게 했다. 정적 검증과 Puppeteer UI smoke를 통과했다.`
- 다음 액션: `없음 — 배포 상태만 최종 보고한다.`
- 차단 사유: `없음`

## 다음 실행 대상

- 완료 파일: `workout/test-v2/board-render.js` · `test-mode-v2.css` · `sw.js` · `docs/ai/features/2026-06-20-growth-board-day-exercise-add.md` · `docs/ai/reviews/2026-06-20-growth-board-day-exercise-add-review.md` · `docs/ai/NEXT_ACTION.md`
- 검증 완료:
  1. PASS: `node --check workout/test-v2/board-render.js`
  2. PASS: `node --check sw.js`
  3. PASS: `node scripts/verify-runtime-assets.mjs`
  4. PASS: `git diff --check`
  5. PASS: `npm.cmd run dev` 후 `http://localhost:5500` HTTP 200 확인
  6. PASS: Puppeteer UI smoke — 성장 보드 오른쪽 `+` 셀 클릭 → 운동 목록 시트 열림
  7. PASS: Puppeteer UI smoke — 종목 선택 후 해당 날짜 `1 담김` 표시와 현재 주차 운동 엔트리 생성 확인

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
