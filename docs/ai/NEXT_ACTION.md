# 다음 자동 액션

## 현재 상태

- 상태: `ready_for_review`
- 계획 문서: `docs/ai/features/2026-06-12-test-mode-v2-board.md` (테스트모드 v2 — 6주 성장 보드, rev 1.2)
- 현재 단계: `execution complete — S0~S7 전체 구현 (사용자 "전부 구현해" 지시)`
- 마지막 완료: `테스트모드 v2 전체 구현 — 신규 workout/test-v2/ 5개 모듈(board-core 순수 로직 / wendler 엔진(v1 복사, 하체 +10) / board-render 보드+시트 6종 / onboarding 첫 설정 / entry 진입 카드) + test-mode-v2.css(tm2- 네임스페이스) + data.js getTestBoardV2/saveTestBoardV2(_settings.test_board_v2) + index.html #tm2-entry + sw.js 범프(tomatofarm-v20260612z7-test-board-v2). 검증: node --test 424 PASS(신규 19), localhost:5599 비로그인 인메모리 실클릭으로 온보딩(메뉴/무게 상속·직접입력/시작일)→보드 렌더(5열·6주 레일·now 셀)→오늘의 배열(① 배지+바)→셀 시트 색칠(도트 채움)→못 채움 조정(미리보기→빗금+감량)→웬들러 전환(TM 제안 137.5, %TM 6칸+BBB)→미니맵(5그룹+오늘선) 전 플로우 확인, 런타임 에러 0`
- 다음 액션: 리뷰 세션 — 계획 문서(계약 13 + 금지 목록 + 용어 사전) 대비 변경 파일 리뷰 + 아래 수동 검증
- 차단 사유: `없음. 단, 로그인 필요 플로우는 not verified yet — (1) Firestore test_board_v2 저장→재로드 왕복, (2) 정산 시트 실확정(6주 경과 또는 시작일 조정 필요), (3) v1 max_cycle 보유 계정에서 온보딩 후보가 v1 기록을 상속하는지`

## 다음 실행 대상

- 리뷰 대상 파일: `workout/test-v2/board-core.js`(신규) · `workout/test-v2/wendler.js`(신규) · `workout/test-v2/board-render.js`(신규) · `workout/test-v2/onboarding.js`(신규) · `workout/test-v2/entry.js`(신규) · `test-mode-v2.css`(신규) · `tests/test-v2.board-core.test.js`(신규) · `data.js` · `workout/index.js` · `index.html` · `sw.js` · `plan.md`
- 리뷰 기준 (계획 문서의 회귀 판정 기준):
  - 필수 구현 계약 13 — 특히 1(보드가 메인), 4(색칠=명시적 탭), 7(증량 하드코딩 금지), 8(메인→바로 BBB), 13(오늘의 배열=보드 위 선택)
  - 금지 목록 — wt-v4-* 미사용, max*.js 미수정/미import, `_settings.max_cycle` 쓰기 0건, 용어 사전 준수(중/고·W1·스텝 미노출)
- 수동 검증 체크리스트 (로그인 필요):
  1. 운동 탭 → "성장 보드" 카드 → 첫 설정 → [6주 칸 채우기] → Firestore 저장 → 새로고침 후 보드 유지
  2. 오늘 행 칸 담기 → 색칠 → 재로드 후 도트/색칠 유지
  3. 종목 설정에서 스쿼트 웬들러 전환 → 저장 → 재로드 후 %TM 칸 유지
  4. (시작일을 과거로 만든 테스트 보드에서) [6주 정산하기] → 성장/유지 → 다음 6주 칸 생성 확인

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
