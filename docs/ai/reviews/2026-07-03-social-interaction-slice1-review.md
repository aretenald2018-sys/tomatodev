# 2026-07-03 Social Interaction Slice 1 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-03-social-interaction-render-decoupling.md`
- Slice: `friend feed action bridge`
- 변경 파일:
  - `home/friend-feed.js`
  - `sw.js`
  - `tests/social-friend-feed-actions.test.js`
  - cache marker를 참조하는 `tests/*.test.js`
  - `docs/ai/NEXT_ACTION.md`

## 리뷰 결과

- 발견 사항: 없음

## 확인한 리스크

1. 같은 feed button에 inline handler와 delegate가 동시에 남으면 이중 실행될 수 있다.
   - 확인: `tests/social-friend-feed-actions.test.js`가 `home/friend-feed.js`의 `onclick=`와 `.onclick =` 재유입을 금지한다.
2. friend manager modal의 sheet 내부 click이 backdrop close와 섞일 수 있다.
   - 확인: `_bindFriendManagerActions(modal)`는 `target === backdrop`일 때만 닫고, row open은 button 클릭이 아닐 때만 처리한다.
3. 친구 id, nickname, photo URL, emoji payload가 HTML attribute에서 깨질 수 있다.
   - 확인: `_feedAttr()`가 `escapeHtml()`을 사용하고, 주요 `data-*` payload가 구조 테스트로 고정됐다.
4. `home/friend-feed.js`는 `STATIC_ASSETS` 대상이므로 cache bump 누락 시 운영에서 이전 handler가 남을 수 있다.
   - 확인: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z18-social-feed-actions`로 bump했고 cache marker 테스트를 갱신했다.

## 검증

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
