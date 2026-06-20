# 다음 자동 액션

## 현재 상태

- 상태: `complete`
- 계획 문서: `docs/ai/features/2026-06-20-growth-board-wendler-rom.md` (성장 보드 웬들러 ROM 입력)
- 현재 단계: `review complete — 배포 완료`
- 마지막 완료: `웬들러 전용 운동 카드의 준비 운동/메인/BBB 세트 행에 ROM 입력을 추가했고, tomatofarm 원격 배포 및 원격 ROM 마커 확인까지 완료했다.`
- 다음 액션: `없음 — 사용자가 캘린더 운동탭 보류 작업을 재개하면 해당 계획을 다시 읽고 진행한다.`
- 차단 사유: `없음`

## 다음 실행 대상

- 완료 파일: `workout/test-v2/board-render.js` · `test-mode-v2.css` · `sw.js` · `build-info.json` · `docs/ai/features/2026-06-20-growth-board-wendler-rom.md` · `docs/ai/reviews/2026-06-20-growth-board-wendler-rom-review.md` · `docs/ai/NEXT_ACTION.md`
- 검증 완료:
  1. PASS: `npm.cmd run verify:assets`
  2. PASS: `node --check workout/test-v2/board-render.js`
  3. PASS: `node --check sw.js`
  4. PASS: `git diff --check`
  5. PASS: `node --test tests/test-v2.board-core.test.js` — 29개 통과
  6. PASS: Node REPL source smoke — `romPct` 입력, `ROM` 헤더, 0-100 클램프, 6열 CSS, 캐시 버전 확인
  7. PASS: Puppeteer 360px layout smoke — ROM 입력 존재, `rowOverflow=0`, `sheetOverflow=0`, `romRight=289 <= 360`
  8. PASS: `git push tomatofarm main` — `7359ef8..fdc487f`
  9. PASS: `node scripts/verify-deploy.mjs https://aretenald2018-sys.github.io/tomatofarm/ 35a7adf575dc`
  10. PASS: 원격 직접 확인 — `/` HTTP 200, `sw.js` z6, `board-render.js` ROM 마커, CSS 6열 grid

## 보류 중 (이전 흐름)

- `docs/ai/features/2026-06-12-test-mode-simplify-wendler.md` — v1 개편 실행 완료(커밋 2922b64까지), 리뷰 미수행. **v2 구현으로 v1은 동결 상태** — 해당 리뷰는 폐기 권장.
- `docs/ai/features/2026-06-20-calendar-workout-tab.md` — Slice 1 구현, 리뷰, tomatofarm 원격 배포 완료. 원격 `/` HTTP 200, `build-info.json` shortCommit `d06e5b523882`, `sw.js` 캐시 버전 `tomatofarm-v20260620z7-growth-board-wendler-rom-calendar-workout-tab` 확인. 브라우저에서 하단 `캘린더` 클릭이 홈에서 전환되지 않아 캘린더 UI 플로우는 not verified yet.

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
