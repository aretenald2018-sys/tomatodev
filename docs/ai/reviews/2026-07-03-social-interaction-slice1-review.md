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
6. not verified yet: 운영 Pages 배포와 운영 URL browser flow 검증이 남아 있다.
