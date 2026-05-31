# 미사용 코드 삭제 리팩토링 계획

## 요청 요약

- 더 이상 이용되지 않는 코드들을 식별하고 삭제한다.
- 삭제 리팩토링은 오탐이 위험하므로, 정적 참조 그래프와 역검색으로 확인된 항목부터 작은 슬라이스로 진행한다.

## 그릴 결과

- 핵심 질문: 삭제 범위를 한 번에 넓게 잡을지, 높은 확신 후보부터 좁게 삭제할지?
- 결정: 높은 확신 후보부터 삭제한다. 첫 슬라이스는 앱 진입점 `index.html` 기준 정적 참조 그래프에서 닿지 않고, `rg` 역참조도 없는 통파일 및 깨진 npm script만 다룬다.
- 남은 가정: 문서/목업/실험 HTML, Firestore 보존용 레거시 컬렉션, `www/` 산출물은 이번 리팩토링 삭제 대상이 아니다.
- 남은 가정: 함수 단위 dead code는 `window.*`, inline `onclick`, lazy import가 많아 오탐 위험이 크므로 별도 슬라이스에서 수동 검증한다.

## 1차 탐색 결과

- 정적 그래프 기준 런타임 JS 중 앱 진입점에서 닿지 않는 파일:
  - `farm-canvas.js`
  - `utils/index.js`
- `farm-canvas.js`
  - export: `renderFarm`, `canvasClickToGrid`
  - 런타임 참조 없음. 현재 홈 농장은 `home/farm.js`의 DOM/emoji 기반 렌더러를 사용한다.
  - `sw.js` `STATIC_ASSETS`와 `scripts/copy-www.js` 명시 target에 없음.
  - `ARCHITECTURE.md`, `CLAUDE.md`에는 아직 구조 설명으로 남아 있어 삭제 시 문서 갱신이 필요하다.
- `utils/index.js`
  - 내용은 `export * from './dom.js';`뿐인 배럴이다.
  - `./utils` 또는 `../utils` 배럴 import 참조가 없다.
  - `scripts/copy-www.js`가 `utils/` 전체를 복사하므로, 삭제 후 런타임 자산 검증이 필요하다.
- `package.json`
  - `crawl` script가 존재하지 않는 `tools/crawl-movies.js`를 가리킨다.
  - 영화 탭은 경량화 이후 삭제된 상태로 문서화되어 있으므로, 첫 슬라이스에서는 깨진 script 제거만 한다.
- 추가 후보:
  - `tools/api-server.js`의 `/api/status`, `/api/crawl-movies` movie crawler route와 `@anthropic-ai/sdk` dependency는 영화 탭 삭제 후 stale 가능성이 높다.
  - 단, `tools/api-server.js`는 `/api/fear-greed` fallback도 제공하므로 movie crawler 제거는 별도 슬라이스에서 진행한다.

## 실행 슬라이스

### Slice 1: 고확신 통파일/깨진 script 삭제

수정 대상:

- `farm-canvas.js`
- `utils/index.js`
- `package.json`
- `ARCHITECTURE.md`
- `CLAUDE.md`
- `docs/ai/NEXT_ACTION.md`

포함:

- `farm-canvas.js` 삭제
- `utils/index.js` 삭제
- `package.json`의 깨진 `crawl` script 제거
- 구조 문서에서 `farm-canvas.js` 설명 제거 또는 현재 `home/farm.js` 렌더러 설명으로 교체

제외:

- `www/` 직접 수정 금지
- `sw.js` 변경 금지. 삭제 후보가 `STATIC_ASSETS`에 없으므로 캐시 버전 bump는 필요하지 않다.
- `tools/api-server.js` movie crawler route 제거 금지
- `@anthropic-ai/sdk` dependency 제거 금지
- 함수 단위 export 정리 금지

검증:

- `node --check app.js data.js render-home.js home/farm.js`
- `node --check farm-canvas.js`는 삭제 후 실행하지 않는다.
- `node --check utils/dom.js`
- `npm.cmd pkg get scripts`
- `node scripts/verify-runtime-assets.mjs`
- `git diff --check`
- 로컬 UI 검증은 사용자가 일반 터미널에서 `npm.cmd run dev`를 실행한 뒤 홈 탭 농장 카드가 정상 렌더링되는지 확인한다.

현재 알려진 검증 갭:

- `node scripts/verify-runtime-assets.mjs`는 현재 기준으로도 미추적 `mockups/trio-renewal/shared.css` 참조 때문에 실패한다. Slice 1에서 이 기존 이슈가 그대로 남으면 `not verified yet`으로 보고하고, 이번 변경과 직접 관련이 없는 baseline blocker로 기록한다.

### Slice 2: 영화 크롤러 서버 코드 정리

전제:

- Slice 1 리뷰 완료 후 진행한다.
- `/api/status`와 `/api/crawl-movies`를 현재 앱/문서/운영에서 더 이상 사용하지 않는지 다시 확인한다.

수정 후보:

- `tools/api-server.js`
- `package.json`
- `package-lock.json`
- `QUICKSTART.md`
- 필요 시 `docs/IMPLEMENTATION_SUMMARY.md`

포함 후보:

- movie crawler 전용 상태/route/console 안내 제거
- `@anthropic-ai/sdk`가 더 이상 import되지 않으면 dependency 제거
- `/api/fear-greed`와 `/api/health`는 보존

제외:

- `data/data-external.js`의 `/api/fear-greed` fallback 변경 금지
- Firebase 데이터 컬렉션 `movies` 삭제 금지

검증:

- `node --check tools/api-server.js`
- `npm.cmd pkg get scripts dependencies`
- `npm.cmd run server`는 장기 실행 서버이므로 Codex 세션에서 계속 띄우지 않는다. 필요 시 사용자가 일반 터미널에서 실행한다.

### Slice 3: 함수/export 단위 dead code 감사

전제:

- Slice 1, Slice 2 리뷰 완료 후 진행한다.
- 각 모듈 그룹을 하나씩만 다룬다.

대상 후보:

- `utils/*`의 미사용 helper
- `admin/*`의 export-only helper
- `calc.js`의 테스트/런타임 미사용 export

규칙:

- `window.*`, inline `onclick`, `data-action`, lazy `import()`를 먼저 역추적한다.
- 동일 파일 내부에서만 쓰이는 export는 export를 제거하되 함수 자체 삭제는 별도 판단한다.
- 동작 삭제는 관련 UI flow를 브라우저에서 직접 확인할 수 있을 때만 진행한다.

## 다음 세션 시작 지점

- 전체 계획 완료.
- 후속으로 더 넓은 dead code 삭제를 진행하려면 새 계획에서 UI 직접 검증 가능한 범위를 별도 슬라이스로 잡는다.

## 실행 기록

- Slice 1 완료: `farm-canvas.js`를 삭제했다. 현재 홈 농장 UI는 `home/farm.js`의 DOM 렌더러를 사용하며, 삭제 파일에 대한 런타임 참조는 발견되지 않았다.
- Slice 1 완료: `utils/index.js` 배럴을 삭제했다. `./utils` 또는 `../utils` 배럴 import 참조는 발견되지 않았다.
- Slice 1 완료: `package.json`에서 존재하지 않는 `tools/crawl-movies.js`를 가리키는 `crawl` script를 제거했다.
- Slice 1 완료: `ARCHITECTURE.md`, `CLAUDE.md`의 오래된 `farm-canvas.js` 구조 설명을 정리했다.
- Slice 1 검증 PASS: `node --check app.js; node --check data.js; node --check render-home.js; node --check home/farm.js; node --check utils/dom.js`
- Slice 1 검증 PASS: `npm.cmd pkg get scripts` 결과에서 `crawl` script가 제거됐다.
- Slice 1 검증 PASS: 삭제 대상 참조 검색에서 `farm-canvas`, `utils/index`, `tools/crawl-movies` 런타임 참조가 남지 않았다.
- Slice 1 검증 PASS: `git diff --check`
- Slice 1 검증 PASS: `node --test tests/*.test.js` 통과 (`371` tests).
- Slice 1 검증 참고: `node --test tests/`는 Windows/Node v24에서 `tests` 디렉토리를 모듈로 해석해 실패했으므로, 같은 검증을 `tests/*.test.js` 패턴으로 재실행했다.
- Slice 1 not verified yet: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 `mockups/trio-renewal/shared.css` 참조 때문에 실패했다. 이번 삭제 파일과 직접 관련된 누락은 확인되지 않았다.
- Slice 1 not verified yet: dev server는 Codex 세션에서 장기 실행하지 않았다. 사용자가 일반 터미널에서 `npm.cmd run dev` 실행 후 홈 탭 농장 카드 렌더링을 확인해야 한다.
- Slice 1 리뷰 완료: `docs/ai/reviews/2026-05-31-unused-code-cleanup-slice1-review.md`에 차단 이슈 없음으로 기록했다.
- Slice 2 완료: `tools/api-server.js`에서 movie crawler 전용 `/api/status`, `/api/crawl-movies`, crawler 상태, Puppeteer 캡처, Claude Vision 추출, movie memory cache를 제거했다.
- Slice 2 완료: `@anthropic-ai/sdk`를 `package.json`과 `package-lock.json`에서 제거했다. `puppeteer`는 검증 스크립트에서 사용 중이라 유지했다.
- Slice 2 완료: `QUICKSTART.md`, `docs/IMPLEMENTATION_SUMMARY.md`를 lite 버전 기준으로 갱신해 movie crawler 사용법을 제거했다.
- Slice 2 검증 PASS: `node --check tools/api-server.js`
- Slice 2 검증 PASS: `npm.cmd pkg get dependencies scripts`
- Slice 2 검증 PASS: `@anthropic-ai/sdk`, `api/status`, `api/crawl-movies`, `movieCache`, `Anthropic`, `tools/crawl-movies`, `"crawl"` 런타임/패키지 참조 제거 확인
- Slice 2 검증 PASS: `node --test tests/*.test.js` 통과 (`371` tests).
- Slice 2 검증 PASS: `git diff --check`
- Slice 2 not verified yet: `npm.cmd run server`는 장기 실행 서버라 Codex 세션에서 실행하지 않았다. 필요 시 사용자가 일반 터미널에서 실행 후 `/api/health` HTTP 200을 확인한다.
- Slice 2 리뷰 완료: `docs/ai/reviews/2026-05-31-unused-code-cleanup-slice2-review.md`에 차단 이슈 없음으로 기록했다.
- Slice 3 완료: `admin/admin-engagement.js`를 삭제하고 `sw.js` `STATIC_ASSETS`에서도 제거했다.
- Slice 3 완료: `sw.js`의 `CACHE_VERSION`을 `tomatofarm-v20260531-unused-cleanup`으로 bump했다.
- Slice 3 완료: `admin/admin-charts.js`에서 외부 참조가 없는 `renderStreakDonut`을 삭제했다.
- Slice 3 완료: `admin/admin-cache.js`의 `getCached`, `setCached`는 동일 파일 내부에서만 쓰이므로 export를 제거했다.
- Slice 3 완료: `admin/admin-segmentation.js`의 내부 분류/점수 helper export를 제거하고 동일 파일 내부 helper로 유지했다.
- Slice 3 완료: `admin/admin-utils.js`에서 외부 참조가 없는 표시 helper `fmtDateShort`, `relativeDay`, `deltaText`, `tierColor`, `tierLabel`, `trajectoryColor`, `healthRing`, `sparklineBars`를 삭제했다.
- Slice 3 완료: stale 영화 seed 도구 `tools/init_firebase.py`, `tools/init_firebase_complete.py`와 stale Railway 영화 크롤러 배포 문서 `docs/RAILWAY_DEPLOYMENT.md`를 삭제했다.
- Slice 3 검증 PASS: 삭제/내부화 대상 역참조 검색 결과 실제 코드 경로에는 외부 참조가 남지 않았다. 과거 작업 로그의 기록성 매치는 제외했다.
- Slice 3 검증 PASS: `node --check admin/admin-cache.js; node --check admin/admin-charts.js; node --check admin/admin-segmentation.js; node --check admin/admin-utils.js; node --check sw.js`
- Slice 3 검증 PASS: `node --check render-admin.js; node --check tools/api-server.js`
- Slice 3 검증 PASS: `npm.cmd pkg get dependencies scripts`
- Slice 3 검증 PASS: `node --test tests/*.test.js` 통과 (`371` tests).
- Slice 3 검증 PASS: `git diff --check`
- Slice 3 검증 참고: `node scripts/verify-runtime-assets.mjs`는 기존 baseline인 미추적 `mockups/trio-renewal/shared.css` 참조 때문에 실패했다. 삭제한 `admin/admin-engagement.js`에 대한 서비스워커 누락은 발생하지 않았다.
- Slice 3 not verified yet: dev server/API server는 Codex 세션에서 장기 실행하지 않았다. 사용자가 일반 터미널에서 앱 URL과 `/api/health`를 확인해야 한다.
- Slice 3 리뷰 완료: `docs/ai/reviews/2026-05-31-unused-code-cleanup-slice3-review.md`에 차단 이슈 없음으로 기록했다.
