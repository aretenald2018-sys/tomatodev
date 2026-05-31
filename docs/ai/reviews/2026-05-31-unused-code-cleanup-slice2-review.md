# 미사용 코드 삭제 리팩토링 Slice 2 리뷰

## 범위

- 계획: `docs/ai/features/2026-05-31-unused-code-cleanup.md`
- Slice: `Slice 2: 영화 크롤러 서버 코드 정리`
- 변경 파일:
  - `tools/api-server.js`
  - `package.json`
  - `package-lock.json`
  - `QUICKSTART.md`
  - `docs/IMPLEMENTATION_SUMMARY.md`

## 검토 결과

- 차단 이슈: 없음.
- `/api/status`, `/api/crawl-movies`, crawler 상태 객체, Puppeteer 스크린샷 캡처, Claude Vision 추출, movie memory cache가 `tools/api-server.js`에서 제거됐다.
- `/api/fear-greed`와 `/api/health`는 보존됐다.
- `@anthropic-ai/sdk`는 더 이상 import되지 않아 `package.json`과 `package-lock.json`에서 제거됐다.
- `puppeteer`는 `scripts/verify-cheers.mjs`, `scripts/verify-rom-live-graph.mjs`에서 계속 사용되므로 유지한 것이 맞다.
- `QUICKSTART.md`, `docs/IMPLEMENTATION_SUMMARY.md`는 lite 버전 기준으로 갱신되어 삭제된 movie crawler 사용법을 더 이상 안내하지 않는다.

## 검증

- PASS: `node --check tools/api-server.js`
- PASS: `npm.cmd pkg get dependencies scripts`
- PASS: `@anthropic-ai/sdk`, `api/status`, `api/crawl-movies`, `movieCache`, `Anthropic`, `tools/crawl-movies`, `"crawl"` 런타임/패키지 참조 제거 확인
- PASS: `node --test tests/*.test.js` (`371` tests)
- PASS: `git diff --check`
- not verified yet: `npm.cmd run server`는 장기 실행 서버라 Codex 세션에서 실행하지 않았다. 필요 시 사용자가 일반 터미널에서 실행 후 `/api/health` HTTP 200을 확인한다.

## 다음 단계

- Slice 3: 함수/export 단위 dead code 감사.
