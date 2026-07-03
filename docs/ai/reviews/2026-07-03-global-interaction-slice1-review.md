# 2026-07-03 전역 상호작용 결합 완화 Slice 1 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-global-interaction-decoupling-refactor.md`
- 변경 파일:
  1. `home/friend-profile.js`
  2. `tests/social-friend-profile-actions.test.js`
  3. `sw.js`
  4. cache marker 테스트

## 결론

- 차단 이슈: 없음
- 판단: profile modal의 주요 action과 비동기 guestbook entry action이 `data-social-action` 기반 scoped delegate로 이동해, 버튼 추가/수정 시 HTML 문자열 안에 전역 함수 호출을 직접 끼워 넣는 위험이 줄었다.

## 확인한 위험

1. 같은 버튼에 inline handler와 delegate가 동시에 남아 이중 실행될 위험
   - 확인 결과: Slice 1 범위의 close, add neighbor, introduce, guild invite, tomato gift, guestbook submit, comment toggle, guestbook reply/delete는 `data-social-action`으로 전환됐다.
   - 테스트: `tests/social-friend-profile-actions.test.js`

2. sheet 내부 click이 backdrop close로 잘못 전파될 위험
   - 확인 결과: listener는 root capture 단계에서 동작하지만 close 조건은 `event.target`이 `[data-social-backdrop]`인 경우로 제한되어, sheet 내부 일반 click은 close되지 않는다.

3. data payload escaping 위험
   - 확인 결과: `data-*` payload는 `_socialAttr()`를 통해 `escapeHtml()` 경로를 사용하며, 공용 `escapeHtml()`은 `"`, `'`를 포함해 attribute payload에 필요한 문자를 escape한다.

## 남은 위험

1. reaction picker/detail, introduce/guild invite 2차 모달, my guestbook modal, comment edit/reply/delete는 아직 inline handler가 남아 있다.
   - 판정: 이번 Slice 1 범위 밖. 다음 social slice 또는 Slice 2 이후 hotspot으로 처리한다.

2. 인증 계정 UI flow는 아직 자동 브라우저에서 직접 조작하지 못했다.
   - 판정: 배포 후 운영 URL에서 로그인 overlay 상태를 확인하고, 인증 세션이 없으면 `not verified yet`으로 명시한다.

## 검증

1. PASS: `node --check home/friend-profile.js; node --check sw.js; node --check tests/social-friend-profile-actions.test.js`
2. PASS: `node --test tests/social-friend-profile-actions.test.js tests/home-hero-layout.test.js tests/home-life-zone-npc-quest.test.js` - 16 pass
3. PASS: `node --test tests/*.test.js` - 667 pass
4. PASS: `git diff --check`
5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
6. PASS: `npm.cmd run deploy:production` - `135dc5128908`, `tomatofarm-v20260703z13-social-profile-actions`
7. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 135dc5128908`
8. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z13-social-profile-actions home/friend-profile.js::_bindFriendProfileActions home/friend-profile.js::quick-add-neighbor home/friend-profile.js::submit-guestbook home/friend-profile.js::data-social-enter-action`
9. PASS: 운영 URL in-app browser 로드 - title `토마토 키우기`, URL `https://aretenald2018-sys.github.io/tomatofarm/`, console error 0건
10. not verified yet: 인증 세션이 없어 실제 친구 프로필 모달 버튼 클릭 flow는 로그인 화면(`loginVisible: true`)에서 막혔다.
