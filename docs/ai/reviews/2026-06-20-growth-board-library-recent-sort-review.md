# 성장 보드 운동 라이브러리 최신순 정렬 리뷰

## 결과

- 차단 이슈 없음.
- `workout/test-v2/board-core.js`의 `sortCandidatesByRecent()`는 후보 배열을 복사해 정렬하므로 기존 후보 생성 순서를 직접 변형하지 않는다.
- `workout/test-v2/board-render.js`는 `S.groupId`로 해당 부위 후보를 좁힌 뒤 최신순 정렬을 적용한다.
- 오늘 세션 후보는 `sessionRecentMap(entries, _todayKey())`로 오늘 날짜를 받아 과거 기록보다 먼저 표시될 수 있다.
- `workout/test-v2/board-core.js`와 `workout/test-v2/board-render.js`가 `STATIC_ASSETS`에 포함되어 있어 `sw.js`의 `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check workout/test-v2/board-core.js`
- PASS: `node --check workout/test-v2/board-render.js`
- PASS: `node --check sw.js`
- PASS: `node --test tests/test-v2.board-core.test.js` (29개 통과)
- PASS: `node scripts/verify-runtime-assets.mjs`
- PASS: `git diff --check`

## 남은 검증 공백

- 로컬 브라우저 UI 플로우는 not verified yet. 사용자 지침상 sandbox에서 장기 dev server를 시작하지 않았다.
- 수동 확인 흐름: `npm.cmd run dev` 후 성장 보드에서 해당 부위 탭 → `＋` → `종목 추가 — 운동 라이브러리` 목록이 최근 수행일 최신순인지 확인한다.
