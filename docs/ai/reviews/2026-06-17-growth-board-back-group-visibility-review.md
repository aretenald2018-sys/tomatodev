# 성장 보드 등 그룹 표시 누락 수정 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-17-growth-board-back-group-visibility.md`
- 변경 파일:
  - `workout/test-v2/board-core.js`
  - `workout/test-v2/board-render.js`
  - `tests/test-v2.board-core.test.js`
  - `sw.js`
  - `docs/ai/features/2026-06-17-growth-board-back-group-visibility.md`
  - `docs/ai/NEXT_ACTION.md`

## 결과

- 차단 이슈 없음.
- `posterior` 매핑 수정은 성장 보드 v2 그룹 판정과 오늘 표시 그룹 필터에만 국한되어 있다.
- `config.js`의 `deadlift`, `rdl`은 이미 `primary: 'back'`, `subPattern: 'posterior'`이므로 이번 수정은 기존 운동 카탈로그 의미와 일치한다.
- `workout/expert.js`의 맥스/전문가 비교 로직도 `posterior`를 `back`으로 분류하고 있어 도메인 간 불일치를 줄였다.
- `workout/test-v2/board-core.js`, `workout/test-v2/board-render.js`가 `sw.js` `STATIC_ASSETS`에 포함되어 있고 `CACHE_VERSION` 범프가 함께 들어갔다.

## 검증

- 재현 확인: 수정 전 `node --test tests/test-v2.board-core.test.js`에서 새 테스트가 `'lower' !== 'back'`으로 실패
- 통과: `node --test tests/test-v2.board-core.test.js`
- 통과: `node --check workout/test-v2/board-core.js`
- 통과: `node --check workout/test-v2/board-render.js`
- 통과: `node --check sw.js`
- 통과: `npm.cmd run dev`
- 통과: `http://localhost:5500/` HTTP 200
- 통과: Puppeteer 브라우저 검증에서 `posterior` RDL 테스트 보드 진입 시 성장 보드 overlay가 열리고 `등` 칩, `등 · 1주차`, `루마니안` 열 헤더가 표시됨
- 통과: `git diff --check`
- 통과: `git push tomatofarm main` (`4930fd5`)
- 통과: 배포 URL `https://aretenald2018-sys.github.io/tomatofarm/` HTTP 200
- 통과: 배포 URL `https://aretenald2018-sys.github.io/tomatofarm/sw.js`에서 `tomatofarm-v20260617z1-growth-board-back-group` 확인
- 통과: 배포 URL Puppeteer 검증에서 `posterior` RDL 테스트 보드 진입 시 `등` 칩, `등 · 1주차`, `루마니안` 열 헤더 표시

## 남은 리스크

- 실제 사용자 계정의 저장된 성장 보드 데이터가 이미 하체 그룹으로 생성된 경우에는 기존 보드 자체의 벤치마크 `groupId`가 남아 있을 수 있다. 이번 수정은 새 후보/오늘 표시 그룹 판정과 렌더 필터를 바로잡는 범위다.
- 저장소에는 이번 요청 전부터 존재한 미커밋 변경이 있어 배포 커밋은 이번 요청 관련 파일만 선별해야 한다.
