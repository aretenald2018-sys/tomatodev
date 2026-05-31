# 미사용 코드 삭제 리팩토링 Slice 1 리뷰

## 범위

- 계획: `docs/ai/features/2026-05-31-unused-code-cleanup.md`
- Slice: `Slice 1: 고확신 통파일/깨진 script 삭제`
- 변경 파일:
  - `farm-canvas.js` 삭제
  - `utils/index.js` 삭제
  - `package.json`
  - `ARCHITECTURE.md`
  - `CLAUDE.md`
  - `docs/ai/NEXT_ACTION.md`

## 검토 결과

- 차단 이슈: 없음.
- `farm-canvas.js` 삭제는 현재 런타임 참조 그래프와 역검색 기준으로 안전하다. 홈 농장 렌더링은 `home/farm.js`가 담당한다.
- `utils/index.js` 삭제는 안전하다. `./utils` 또는 `../utils` 배럴 import가 없고, 실제 유틸은 개별 파일 경로로 import된다.
- `package.json`의 `crawl` script 제거는 적절하다. 해당 script는 존재하지 않는 `tools/crawl-movies.js`를 가리키고 있었다.
- 삭제 대상은 `sw.js` `STATIC_ASSETS`에 없으므로 이번 Slice 1에서 `CACHE_VERSION` bump가 필요하지 않다.

## 검증

- PASS: `node --check app.js; node --check data.js; node --check render-home.js; node --check home/farm.js; node --check utils/dom.js`
- PASS: `npm.cmd pkg get scripts` 결과에서 `crawl` script 제거 확인
- PASS: 삭제 대상 참조 검색에서 `farm-canvas`, `utils/index`, `tools/crawl-movies` 런타임 참조 없음
- PASS: `git diff --check`
- PASS: `node --test tests/*.test.js` (`371` tests)
- 참고: `node --test tests/`는 Windows/Node v24에서 디렉토리를 모듈로 해석해 실패했고, 동일 목적의 파일 패턴 검증은 통과했다.
- not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 `mockups/trio-renewal/shared.css` 참조 때문에 실패했다. 이번 삭제 파일과 직접 관련된 누락은 발견되지 않았다.
- not verified yet: dev server 장기 실행은 Codex 세션에서 하지 않았다. 홈 탭 농장 카드 UI는 사용자가 일반 터미널에서 `npm.cmd run dev` 실행 후 확인해야 한다.

## 다음 단계

- Slice 2: 영화 크롤러 서버 코드 정리.
