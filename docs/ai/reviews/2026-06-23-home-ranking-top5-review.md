# 홈탭 랭킹 상위 5위 표출 제한 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-home-ranking-cleanup.md`
- 실행 범위: Slice 3 — 랭킹 상위 5위까지만 표출
- 변경 파일:
  - `home/hero.js`
  - `sw.js`
  - `docs/ai/features/2026-06-23-home-ranking-cleanup.md`
  - `docs/ai/NEXT_ACTION.md`

## 결론

치명적 문제는 발견하지 못했다. 랭킹 계산 대상은 전체 계정 그대로 유지하되, 실제 홈탭 화면 렌더링은 상위 5명까지만 제한된다.

## 확인한 내용

- `LEADERBOARD_DISPLAY_LIMIT = 5`를 추가했다.
- `_renderLeaderboardHtml()`에서 정렬된 `board`의 앞 5명만 `visibleBoard`로 잘라 렌더한다.
- 누적/주간 데이터 조회와 정렬 대상은 전체 계정 기준을 유지한다.
- `home/hero.js`와 `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260623-home-ranking-top5`로 bump했다.

## 검증

- `node --check .\home\hero.js`
- `node --check .\sw.js`
- `node --test .\tests\home-life-zone-state.test.js`
  - 결과: 5개 테스트 통과
- `STATIC_ASSETS` 파일 존재 검사
  - 결과: `static assets exist: 191`
- `git diff --check`
  - 결과: 통과. CRLF 변환 경고만 출력됨.

## not verified yet

브라우저 UI 플로우는 not verified yet이다. 정상 터미널에서 `npm.cmd run dev` 실행 후 홈탭 랭킹이 최대 5명까지만 표시되는지 확인해야 한다.
