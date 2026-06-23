# 홈탭 랭킹 전체 계정 전수 표출 리뷰

## 리뷰 대상

- 계획 문서: `docs/ai/features/2026-06-23-home-ranking-cleanup.md`
- 실행 범위: Slice 2 — 랭킹 전체 계정 전수 표출
- 변경 파일:
  - `home/hero.js`
  - `sw.js`
  - `docs/ai/features/2026-06-23-home-ranking-cleanup.md`
  - `docs/ai/NEXT_ACTION.md`

## 결론

치명적 문제는 발견하지 못했다. 랭킹 참가자 범위가 `나 + 이웃`에서 `_accounts` 전체 계정으로 변경되었고, 누적/주간 모두 전체 계정의 기록을 읽어 계산한다.

## 확인한 내용

- `home/hero.js`의 참가자 생성은 `getAccountList()` 전체 계정을 기준으로 한다.
- 현재 로그인 사용자는 `_accounts`에 누락되어도 `나`로 포함된다.
- 같은 사용자로 판정되는 계정은 `__me__` 키로 중복 표시되지 않게 처리했다.
- `누적` 랭킹은 전체 계정별 `workouts` 컬렉션을 읽어 활성 기록일 수를 계산한다.
- `주간` 랭킹은 전체 계정별 이번 주 7개 `workouts` 문서를 읽어 활성 기록일 수를 계산한다.
- 친구가 없어도 전체 계정이 1명 이상이면 랭킹 카드가 표시된다.
- 히어로 소셜 proof 문구는 기존처럼 이웃 기반으로만 갱신한다.
- `home/hero.js`와 `sw.js`는 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 `tomatofarm-v20260623-home-ranking-all-accounts`로 bump했다.

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

브라우저 UI 플로우는 not verified yet이다. 정상 터미널에서 `npm.cmd run dev` 실행 후 홈탭에서 비이웃 계정도 랭킹에 표시되는지 확인해야 한다.

## 잔여 리스크

- 전체 계정 수가 커지면 홈 진입 시 Firestore read가 늘어난다. 특히 주간은 계정 수 x 7개 문서를 읽는다.
- 계정 수 증가 후 성능 문제가 보이면 `_ranking_current` 같은 집계 문서로 전환하는 별도 설계가 필요하다.
