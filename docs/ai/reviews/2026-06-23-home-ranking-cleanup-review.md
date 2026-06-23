# 홈탭 랭킹/길드 카드 정리 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-home-ranking-cleanup.md`
- 실행 범위: Slice 1 — 홈탭 랭킹/길드 카드 정리
- 변경 파일:
  - `index.html`
  - `home/index.js`
  - `home/hero.js`
  - `sw.js`
  - `docs/ai/NEXT_ACTION.md`

## 결론

치명적 문제는 발견하지 못했다. 홈탭의 `함께 축하해요!` 공용 카드와 별도 `길드` 카드는 DOM과 렌더 호출에서 제거되었고, 랭킹 카드는 `랭킹` 제목과 `누적/주간` 탭 구조로 전환되었다.

## 확인한 내용

- `index.html`에서 `#card-celebrations`와 `#card-guild` 컨테이너를 제거했다.
- `#card-leaderboard` 제목은 `랭킹`으로 변경했다.
- 기존 `개인/길드` 세그먼트는 `누적/주간`으로 변경했다.
- `home/index.js`에서 `renderCheersCard()`와 `renderGuildCard()` import/call을 제거했다.
- 미확인 응원 오버레이(`home/cheer-card.js`)는 이번 요청 대상이 아니므로 유지했다.
- `home/hero.js`에서 `guild` 랭킹 분기와 `computeGuildStats()` 의존성을 제거했다.
- 랭킹 기본값은 `cumulative`이며, 사용자가 `weekly` 또는 `cumulative`를 누르면 `localStorage`의 `tomatofarm.home.leaderboard.period`에 저장된다.
- `weekly`는 기존 글로벌 주간 랭킹 우선, 없으면 이웃 기반 폴백 구조를 유지한다.
- `cumulative`는 나와 이웃의 전체 `workouts` 기록 중 활성 기록일 수로 계산한다.
- 카드가 숨김 상태에서 첫 렌더될 때 세그먼트 indicator 폭이 0이 될 수 있어, 표시 후 한 번 더 indicator를 동기화한다.
- `index.html`, `home/index.js`, `home/hero.js`, `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260623-home-ranking-cleanup`으로 bump했다.

## 검증

- `node --check .\home\hero.js`
- `node --check .\home\index.js`
- `node --check .\sw.js`
- `node --test .\tests\home-life-zone-state.test.js`
  - 결과: 5개 테스트 통과
- `STATIC_ASSETS` 파일 존재 검사
  - 결과: `static assets exist: 191`
- `git diff --check`
  - 결과: 통과. CRLF 변환 경고만 출력됨.

## not verified yet

브라우저 UI 플로우는 not verified yet이다. 이 환경에서는 long-lived dev server를 완료 검증으로 주장하지 않으므로, 정상 터미널에서 `npm.cmd run dev` 실행 후 홈탭에서 카드 표시와 탭 저장 동작을 직접 확인해야 한다.

## 잔여 리스크

- 누적 랭킹은 별도 서버 전역 누적 랭킹 컬렉션이 없어서 `나 + 이웃` 범위로 계산한다. 전역 누적 랭킹이 필요하면 별도 집계 설계가 필요하다.
- 선택값 저장은 기기별 `localStorage` 기준이다. 계정 간 동기화가 필요하면 `settings` 저장으로 확장해야 한다.
