# 성장 보드 웬들러 ROM 입력 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-20-growth-board-wendler-rom.md`
- 변경 파일:
  - `workout/test-v2/board-render.js`
  - `test-mode-v2.css`
  - `sw.js`
  - `build-info.json`
  - `docs/ai/features/2026-06-20-growth-board-wendler-rom.md`
  - `docs/ai/NEXT_ACTION.md`

## 결과

- 차단 이슈 없음.
- 웬들러 전용 `준비 운동`, `메인`, `BBB` 세트 행에 `ROM` 입력이 추가되어 일반 성장 보드 운동카드와 같은 `romPct` 저장 경로를 갖는다.
- `romPct`는 변경 시 0-100 정수로 클램프되며, 빈 값은 100으로 복구되어 완료 저장 시 0으로 오인되지 않는다.
- CSS grid가 6열로 조정되어 모바일 360px smoke에서 row/sheet overflow가 없다.
- `test-mode-v2.css`, `workout/test-v2/board-render.js`, `sw.js`는 `STATIC_ASSETS`에 포함되어 있고 `CACHE_VERSION`이 `tomatofarm-v20260620z6-growth-board-wendler-rom`으로 범프되어 캐시 규칙을 충족한다.

## 검증

- PASS: `npm.cmd run verify:assets`
- PASS: `node --check workout/test-v2/board-render.js`
- PASS: `node --check sw.js`
- PASS: `git diff --check`
- PASS: `node --test tests/test-v2.board-core.test.js` — 29개 통과
- PASS: Node REPL source smoke — `romPct` 입력, `ROM` 헤더, 0-100 클램프, 6열 CSS, 캐시 버전 확인
- PASS: Puppeteer 360px layout smoke — ROM 입력 존재, `rowOverflow=0`, `sheetOverflow=0`, `romRight=289 <= 360`

## 잔여 리스크

- 로그인된 실제 계정의 완전한 end-to-end 입력 저장은 인증 상태가 없어 무인 브라우저에서 수행하지 못했다. 대신 렌더 소스와 360px 레이아웃 fixture, 기존 성장 보드 순수 테스트로 회귀를 확인했다.
- 사용자 지침상 장기 dev server는 이 세션에서 검증 완료로 주장하지 않는다. 로컬 UI 확인은 `npm.cmd run dev` 후 성장 보드 하체 웬들러 카드를 열어 확인한다.
