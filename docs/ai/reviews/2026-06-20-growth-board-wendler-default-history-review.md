# 성장 보드 웬들러 기본값 및 과거 기록 표시 수정 리뷰

## 변경 파일

- `workout/test-v2/board-core.js`
- `workout/test-v2/board-render.js`
- `workout/test-v2/onboarding.js`
- `data.js`
- `tests/test-v2.board-core.test.js`
- `sw.js`
- `docs/ai/features/2026-06-20-growth-board-wendler-default-history.md`

## 리뷰 결과

- 문제 없음.
- 웬들러 기본값은 v2 보드의 현재/보관 벤치마크를 v1보다 우선해 상속한다.
- 사용자가 같은 종목을 기본 계단으로 바꾼 경우에는 v1 웬들러 설정이 다시 기본값으로 살아나지 않는다.
- 과거 셀 시트는 보드 색칠 로그가 없을 때도 같은 주의 실제 운동기록을 조회해 표시한다.
- 과거 주 문서가 메모리 캐시에 없을 때를 대비해 해당 주 7일 문서를 `data.js` 경유로 보강 로드한다.

## 검증

1. PASS: `node --check data.js`
2. PASS: `node --check workout/test-v2/board-core.js`
3. PASS: `node --check workout/test-v2/board-render.js`
4. PASS: `node --check workout/test-v2/onboarding.js`
5. PASS: `node --check sw.js`
6. PASS: `node --test tests/test-v2.board-core.test.js` — 31개 통과
7. PASS: `git diff --check`

## 남은 검증

- not verified yet: 이 세션 지침상 장기 dev server를 sandbox에서 시작하지 않았다.
- 로컬 일반 터미널에서 `npm.cmd run dev` 실행 후 성장 보드 하체 과거 2026-06-08 주차 스모데드 셀을 열어 `운동기록 있음`이 표시되는지 확인해야 한다.
