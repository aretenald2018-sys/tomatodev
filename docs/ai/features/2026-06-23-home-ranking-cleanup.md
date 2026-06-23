# 홈탭 랭킹/길드 카드 정리 계획

## 요청

- 홈탭에서 `함께 축하해요!` 카드를 제거한다.
- `주간 랭킹` 카드 제목을 `랭킹`으로 바꾼다.
- 랭킹 안의 `길드` 관련 정보 표시는 제거한다.
- 기존 `개인/길드` 탭을 `누적/주간` 탭으로 바꾼다.
- 사용자가 별도로 선택하지 않았으면 `누적`을 기본값으로 보여준다.
- 사용자가 `누적` 또는 `주간`을 누르면 그 선택을 다음 홈 진입 기본값으로 저장한다.
- 홈탭의 `길드` 카드도 제거한다.
- 후속 요청: 랭킹은 이웃 여부와 무관하게 전체 계정을 전수 표출한다.
- 후속 요청: 랭킹 화면 표출은 5위까지만 제한한다.

## 현재 구조 관찰

- 홈탭 정적 DOM은 `index.html`의 `#tab-home`에 있다.
- `함께 축하해요!` 카드는 `#card-celebrations` 컨테이너와 `home/cheers-card.js`의 `renderCheersCard()` 호출로 렌더된다.
- 별도 미확인 응원 오버레이는 `home/cheer-card.js`와 `#home-cheer-slot` 흐름이다. 이번 요청의 대상은 `함께 축하해요!` 공용 카드이므로 오버레이는 유지한다.
- 랭킹 카드는 `#card-leaderboard`와 `home/hero.js`의 `renderLeaderboard()`가 담당한다.
- 현재 랭킹 탭은 `individual/guild` 상태이며, `guild` 선택 시 `computeGuildStats()` 기반 길드 랭킹을 렌더한다.
- 홈탭의 별도 길드 카드는 `#card-guild`와 `home/guild-card.js`의 `renderGuildCard()` 호출이 담당한다.
- `index.html`, `home/index.js`, `home/hero.js`, `style.css`, `sw.js`는 서비스워커 `STATIC_ASSETS` 대상이므로 수정 시 `CACHE_VERSION`을 bump해야 한다.

## 실행 범위

### Slice 1 — 홈탭 랭킹/길드 카드 정리

- `index.html`
  - `#card-celebrations` 제거.
  - 랭킹 제목을 `랭킹`으로 변경.
  - 랭킹 탭 버튼을 `누적/주간`으로 변경.
  - `#card-guild` 제거.
- `home/index.js`
  - `renderCheersCard()` import/call 제거.
  - `renderGuildCard()` import/call 제거.
  - 미확인 응원 오버레이 흐름은 유지.
- `home/hero.js`
  - 랭킹 상태를 `cumulative/weekly`로 변경.
  - 기본값은 `cumulative`.
  - 선택값은 `localStorage`에 저장한다.
  - `guild` 렌더링 및 `computeGuildStats()` 의존성을 제거한다.
  - `weekly`는 기존 주간 랭킹 로직을 재사용한다.
  - `cumulative`는 나와 이웃의 전체 `workouts` 기록 중 활성 기록일 수를 합산해 표시한다.
- `style.css`
  - 길드 랭킹 전용 스타일은 더 이상 홈 랭킹에서 사용하지 않도록 제거 또는 미사용 상태로 둔다.
- `sw.js`
  - `CACHE_VERSION`을 bump한다.

### Slice 2 — 랭킹 전체 계정 전수 표출

- `home/hero.js`
  - 랭킹 참가자 소스를 `getMyFriends()`가 아니라 `getAccountList()` 전체로 바꾼다.
  - 현재 로그인 사용자는 항상 `나`로 표시하고, `_accounts`에 누락되어도 참가자에 포함한다.
  - `누적`은 전체 계정의 `workouts` 기록을 읽어 활성 기록일 수를 계산한다.
  - `주간`도 전체 계정의 이번 주 `workouts` 문서를 읽어 활성 기록일 수를 계산한다.
  - 홈 상단 소셜 proof는 기존처럼 이웃 기반 문구로만 갱신해, 비이웃 이름이 히어로 메시지에 섞이지 않게 한다.
- `docs/ai/*`
  - 전수 표출 변경과 검증 결과를 남긴다.

### Slice 3 — 랭킹 상위 5위까지만 표출

- `home/hero.js`
  - 누적/주간 계산 대상은 전체 계정으로 유지한다.
  - 실제 화면 렌더링은 정렬된 랭킹의 상위 5명까지만 제한한다.
- `sw.js`
  - `home/hero.js`가 `STATIC_ASSETS` 대상이므로 `CACHE_VERSION`을 bump한다.

## 제외 범위

- 가입/프로필/알림/관리 모달의 길드 기능 자체는 제거하지 않는다.
- `home/guild-card.js` 파일 자체와 서비스워커 등록을 삭제하지 않는다. 다른 화면이나 추후 복구 가능성을 위해 홈 호출만 끊는다.
- 미확인 응원 오버레이(`home/cheer-card.js`)는 제거하지 않는다.
- 서버 전역 누적/주간 랭킹 컬렉션을 새로 만들지 않는다.
- 전체 계정 전수 표출 때문에 계정 수가 늘면 홈 진입 시 Firestore read가 늘어날 수 있다. 성능 문제가 보이면 별도 집계 문서로 옮긴다.
- 상위 5위 제한은 표출 제한일 뿐 계산/정렬 대상 제한이 아니다.

## 검증 계획

- `node --check .\home\hero.js`
- `node --check .\home\index.js`
- `node --check .\sw.js`
- 가능한 경우 새 랭킹 순수 헬퍼는 `node:test`로 검증한다.
- `STATIC_ASSETS` 파일 존재 검사.
- `git diff --check`
- 브라우저 UI는 정상 터미널에서 `npm.cmd run dev` 실행 후 홈탭에서 확인한다.

## 결정

- 사용자 요청이 명확하므로 Slice 1을 승인된 실행 범위로 간주하고 바로 실행한다.
- Slice 2도 사용자 후속 요청이 명확하므로 승인된 실행 범위로 간주하고 바로 실행한다.
- Slice 3도 사용자 후속 요청이 명확하므로 승인된 실행 범위로 간주하고 바로 실행한다.
