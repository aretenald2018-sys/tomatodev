# 2026-07-03 Social Interaction Render Decoupling

## 요청

`리팩토링 수행할 것. 특히 운동종목추가/운동카드추가 관련한 오류가, 무언가 수정할 때마다 다른게 고장나는 방식으로 너무 많이 나는데 UI와 벡엔드 상호의존성을 줄이고 무언가 추가했을 때 계속 꼬이거나 오류가 나지 않는 방향으로 코드 전체를 리팩토링할 것. 운동코드 관련 리팩토링 끝났다고 그만두지 말고 코드 전체를 조망해서 리팩토링 깔끔하게 해서 추가적인 오류가 나지 않게 하고, 버튼 클릭시 속도가 무겁게 느껴지지않도록 경량화도 신경쓸 것. 화면단에서 검증까지 완료한 후에 배포할 것.`

## 그릴 결과

- 질문: 직전 전역 리팩토링 완료 후 다음 범위를 어디로 잡을 것인가?
- 코드 근거:
  1. `docs/ai/NEXT_ACTION.md`는 직전 전역 계획을 `complete`로 기록하고, 후속 후보로 social feed/profile reaction 중복 렌더와 남은 inline handler 재인벤토리를 지정한다.
  2. `home/friend-profile.js`에는 `onclick=` 29개, `home/friend-feed.js`에는 `onclick=` 13개가 남아 있다.
  3. `home/friend-profile.js` reaction/comment 경로는 `showReactionPicker`, `sendReaction`, `submitComment`, `editCommentUI`, `deleteCommentUI` 같은 전역 함수와 inline payload escaping에 의존한다.
  4. `home/friend-feed.js` reaction 경로는 `friendLike -> toggleLike -> renderFriendFeed()`로 feed 전체를 즉시 다시 그리며, profile reaction도 `_renderFriendFeedFn()`를 직접 호출한다.
- 결정: 다음 흐름은 social feed/profile interaction을 대상으로 한다. 첫 실행 slice는 `home/friend-feed.js`의 feed-local action bridge로 좁히고, profile comment/reaction과 render scheduler는 별도 slice로 분리한다.
- 남은 가정: 인증 화면 때문에 운영 URL에서 실제 social UI click flow는 자동 브라우저로 막힐 수 있다. 그 경우 운영 marker와 로그인 화면/console 상태를 검증하고, 인증 UI flow는 `not verified yet`으로 명시한다.

## 진단 요약

1. 남은 social action은 HTML 문자열 내부 inline `onclick`에 id, name, photo URL, emoji를 직접 끼워 넣는다. 새 버튼 추가나 escaping 변경 시 UI와 전역 함수 계약이 같이 깨질 위험이 높다.
2. reaction/comment action은 data layer(`toggleLike`, `writeComment`, `editComment`, `deleteComment`) 호출 직후 화면 전체 렌더나 profile modal 재생성을 직접 실행한다.
3. 이미 `home/friend-profile.js`에는 `_bindFriendProfileActions(root)`가 있어 scoped delegate 확장 경로가 있고, `home/friend-feed.js`에도 `#friend-feed` click listener가 있어 feed-local delegate로 옮기기 쉽다.
4. 이 흐름은 운동 add/card 경계와 같은 종류의 문제다. UI 이벤트, payload parsing, 저장 호출, 전체 rerender가 한 handler에 섞여 있어 작은 변경이 다른 화면을 흔든다.

## 목표

- social feed/profile의 남은 inline handler와 전역 reaction/comment 함수 의존을 줄인다.
- click action과 data 저장/렌더 요청 사이에 작은 계약을 둔다.
- reaction/comment 후 불필요한 전체 렌더를 줄이거나 최소한 같은 프레임에서 병합한다.
- 각 slice마다 구조 테스트, cache bump, 운영 Pages 배포 검증을 수행한다.

## 비목표

- Firestore schema 변경은 하지 않는다.
- 친구/길드/알림 데이터 모델을 재설계하지 않는다.
- admin social/outreach inline handler는 이번 계획 범위에서 제외한다.
- 식단/운동/캘린더 root `index.html` inline handler는 별도 계획으로 남긴다.

## 실행 슬라이스

### Slice 1: friend feed action bridge

- 목표: `home/friend-feed.js`의 feed/manager/reaction picker 주요 inline action을 `data-feed-action` delegate로 전환한다.
- 범위:
  1. `#friend-feed`와 friend manager modal 내부 action을 feed-local delegate로 라우팅한다.
  2. quick add, accept/reject request, inactive toggle, meal photo open, friend manager close/request/delete/nickname/introduce, reaction picker option을 `data-feed-action`으로 옮긴다.
  3. 기존 `window.quickAddNeighbor`, `window.acceptFriendReq`, `window.rejectFriendReq`, `window.friendLike`, `window.showReactionPicker`, `window.showReactionDetail` 호환은 필요한 범위만 유지하되 새 markup은 직접 호출하지 않게 한다.
- 제외:
  - profile modal comment/reaction markup은 건드리지 않는다.
  - render scheduling은 Slice 3에서 다룬다.
- 검증:
  1. `node --check home/friend-feed.js; node --check sw.js`
  2. 신규 구조 테스트: feed 주요 markup slice에 `onclick=` 없음, `data-feed-action` 존재, delegate idempotent 확인
  3. 관련 social/login/app shell 테스트
  4. `node --test tests/*.test.js`
  5. `git diff --check`
  6. `node scripts/verify-runtime-assets.mjs`
  7. 운영 Pages deploy + marker 검증
  8. 운영 URL browser 확인
- 실행 요약:
  1. `home/friend-feed.js`에 `_bindFriendFeedActions(root)`와 `_runFriendFeedAction(action, control, event)`를 추가했다.
  2. `#friend-feed`, `#friend-notifications`, friend manager modal, reaction picker option의 주요 버튼을 `data-feed-action`으로 전환했다.
  3. friend manager modal은 `_bindFriendManagerActions(modal)`로 row open/backdrop close를 처리하고, sheet 내부 action은 global inline handler에 의존하지 않게 했다.
  4. feed render 후 붙이던 `.onclick`/per-element listener는 `_friendFeedGoPage`, `_friendFeedSendCheer` root callback + delegate 호출로 옮겼다.
  5. `tests/social-friend-feed-actions.test.js`를 추가해 `home/friend-feed.js`의 `onclick=`/`.onclick =` 재유입을 막는다.
  6. `home/friend-feed.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z18-social-feed-actions`로 bump했다.
- 현재 검증:
  1. PASS: `node --check home/friend-feed.js; node --check sw.js; node --check tests/social-friend-feed-actions.test.js`
  2. PASS: `node --test tests/social-friend-feed-actions.test.js tests/social-friend-profile-actions.test.js tests/login-action-bridge.test.js tests/app-shell-action-bridge.test.js tests/pwa-update-auto-reload.test.js` - 19 pass
  3. PASS: `node --test tests/*.test.js` - 688 pass
  4. PASS: `git diff --check`
  5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
  6. PASS: `npm.cmd run deploy:production` - `d15af94f6324`, `tomatofarm-v20260703z18-social-feed-actions`
  7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ d15af94f6324`
  8. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z18-social-feed-actions home/friend-feed.js::_bindFriendFeedActions home/friend-feed.js::data-feed-action home/friend-feed.js::friendFeedActionsBound tests/social-friend-feed-actions.test.js::friendFeedActionsBound`
  9. PASS: 운영 URL browser 확인 - `https://aretenald2018-sys.github.io/tomatofarm/` title `토마토 키우기`, login screen/app shell 표시, console error 0.
  10. not verified yet: 인증 세션이 없어 실제 friend feed 내부 `data-feed-action` 클릭 flow는 자동 검증하지 못했다.

### Slice 2: profile reaction/comment action bridge

- 목표: `home/friend-profile.js`의 reaction/comment inline action을 기존 `_bindFriendProfileActions(root)` 계약으로 흡수한다.
- 범위:
  1. meal/workout reaction badge/button을 `data-social-action`으로 전환한다.
  2. comment submit/edit/delete/reply/save와 Enter key action을 `data-social-action`/`data-social-enter-action`으로 전환한다.
  3. `sendReaction`과 comment UI helpers는 DOM payload를 직접 파싱하는 작은 dispatcher 뒤로 숨긴다.
- 제외:
  - guestbook primary action은 이미 이전 slice에서 다뤘으므로 회귀 확인만 한다.
  - feed 전체 rerender 병합은 Slice 3에서 다룬다.
- 검증:
  1. `node --check home/friend-profile.js; node --check sw.js`
  2. 신규/기존 social profile action 테스트 확장
  3. full test, runtime assets, deployed marker
  4. 운영 URL browser 확인
- 실행 요약:
  1. `_bindFriendProfileActions(root)`에 `open-meal-photo`, reaction picker/detail, comment submit/reply/edit/delete/save/cancel action을 추가했다.
  2. meal/workout reaction badge와 picker button은 `data-social-action`과 `data-target-id`/`data-date-key`/`data-field` payload로 전환했다.
  3. 댓글 입력 Enter, 등록, 답글, 수정, 삭제, 수정 저장은 inline `onkeydown`/`onclick`에서 delegate로 옮겼다.
  4. comment reply cancel은 `.onclick` property 대신 `cancel-comment-reply` action으로 처리한다.
  5. `tests/social-friend-profile-actions.test.js`가 reaction/comment delegate 계약과 inline 재유입 방지를 확인한다.
  6. `home/friend-profile.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z19-social-profile-actions`로 bump했다.
- 현재 검증:
  1. PASS: `node --check home/friend-profile.js; node --check sw.js; node --check tests/social-friend-profile-actions.test.js`
  2. PASS: `node --test tests/social-friend-profile-actions.test.js tests/social-friend-feed-actions.test.js tests/login-action-bridge.test.js tests/app-shell-action-bridge.test.js tests/pwa-update-auto-reload.test.js` - 19 pass
  3. PASS: `node --test tests/*.test.js` - 688 pass
  4. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
  5. PASS: `git diff --check`
  6. INFO: `d8f9b8df241bff241856571259163905baf4678c` push 완료.
  7. INFO: Pages deploy action이 GitHub 내부 오류 `Deployment failed, try again later.`로 실패했다. 실패 run: push `28658327024`, workflow_dispatch `28658491911`, workflow_dispatch `28658583875`.
  8. PASS: workflow_dispatch `28658751644` 재시도로 Pages deploy 성공.
  9. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ d46c535267feacd3cf120770476c431ef59d59db`
  10. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z19-social-profile-actions home/friend-profile.js::_bindFriendProfileActions home/friend-profile.js::data-social-action home/friend-profile.js::confirm-edit-comment tests/social-friend-profile-actions.test.js::tomatofarm-v20260703z19-social-profile-actions`
  11. PASS: 운영 URL browser 확인 - `https://aretenald2018-sys.github.io/tomatofarm/` title `토마토 키우기`, login screen/app shell 표시, console error 0.
  12. not verified yet: 인증 세션이 없어 실제 friend profile 내부 reaction/comment `data-social-action` 클릭 flow는 자동 검증하지 못했다.

### Slice 3: social render scheduler

- 목표: reaction/comment/friend request 후 feed/profile 전체 렌더 요청을 직접 실행하지 않고 scheduler로 병합한다.
- 범위:
  1. `renderFriendFeed()` 직접 호출 중 user action 후속 렌더를 `_scheduleFriendFeedRender()`로 모은다.
  2. profile reaction 후 `_renderFriendFeedFn()` 호출도 같은 scheduler 또는 dependency adapter를 거치게 한다.
  3. profile modal이 열린 경우 필요한 modal refresh와 feed refresh를 분리해, 숨겨진 feed 전체 렌더를 피하거나 같은 프레임 1회로 병합한다.
- 제외:
  - 데이터 저장 API 변경은 하지 않는다.
  - Firestore listener 도입은 하지 않는다.
- 검증:
  1. scheduler 구조 테스트: 직접 `renderFriendFeed()` user-action 호출 금지, scheduler helper 존재
  2. social feed/profile tests
  3. full test, runtime assets, deployed marker
  4. 운영 URL browser 확인

## 위험과 완화

1. 같은 버튼에 inline handler와 delegate가 동시에 남으면 이중 실행될 수 있다.
   - 완화: slice별 구조 테스트에서 대상 markup의 `onclick=` 부재를 확인한다.
2. modal sheet가 `event.stopPropagation()`을 쓰면 overlay delegate가 버튼 클릭을 놓칠 수 있다.
   - 완화: friend manager/profile modal 내부 sheet 또는 root에 직접 delegate를 건다.
3. payload escaping이 깨지면 친구 id, nickname, photo URL, emoji가 잘못 전달될 수 있다.
   - 완화: `data-*` attribute용 escaping helper를 사용하고, 테스트에서 representative payload를 확인한다.
4. 전체 렌더를 scheduler로 늦추면 저장 직후 UI 갱신이 느려 보일 수 있다.
   - 완화: `requestAnimationFrame` 1회 지연만 허용하고, toast/optimistic micro-state는 즉시 유지한다.

## NEXT_ACTION.md 업데이트

- 계획 세션 종료 상태: `ready_for_execution`
- Slice 1 실행 후 상태: `deployed_with_auth_flow_gap`
- Slice 2 실행 후 상태: `deployed_with_auth_flow_gap`
- 다음 액션: Slice 3 `social render scheduler`를 실행한다.
- 차단 질문: 없음
