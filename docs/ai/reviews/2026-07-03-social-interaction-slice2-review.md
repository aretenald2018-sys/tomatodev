# 2026-07-03 Social Interaction Slice 2 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-03-social-interaction-render-decoupling.md`
- Slice: `profile reaction/comment action bridge`
- 변경 파일:
  - `home/friend-profile.js`
  - `sw.js`
  - `tests/social-friend-profile-actions.test.js`
  - cache marker를 참조하는 `tests/*.test.js`
  - `docs/ai/NEXT_ACTION.md`

## 리뷰 결과

- 발견 사항: 없음

## 확인한 리스크

1. reaction picker/detail 버튼에 inline handler와 delegate가 동시에 남으면 이중 실행될 수 있다.
   - 확인: meal/workout reaction control은 `data-social-action`으로 전환했고 테스트가 `showReactionPicker`/`showReactionDetail(this` inline 재유입을 막는다.
2. 댓글 submit/edit/delete/reply가 target/date/section payload를 잃으면 다른 날짜 또는 다른 section 댓글을 갱신할 수 있다.
   - 확인: `data-target-id`, `data-date-key`, `data-section`, `data-comment-id`를 구조 테스트로 고정했다.
3. comment reply cancel을 동적 생성하면서 modal delegate 밖으로 빠지면 버튼이 동작하지 않을 수 있다.
   - 확인: cancel button은 같은 modal 내부에 삽입되고 `cancel-comment-reply` action으로 처리된다.
4. `home/friend-profile.js`는 `STATIC_ASSETS` 대상이므로 cache bump 누락 시 운영에서 이전 inline handler가 남을 수 있다.
   - 확인: `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z19-social-profile-actions`로 bump했고 cache marker 테스트를 갱신했다.

## 검증

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
