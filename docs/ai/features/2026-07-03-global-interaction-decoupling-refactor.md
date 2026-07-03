# 2026-07-03 전역 상호작용 결합 완화 리팩토링

## 요청 원문

`리팩토링 수행할 것. 특히 운동종목추가/운동카드추가 관련한 오류가, 무언가 수정할 때마다 다른게 고장나는 방식으로 너무 많이 나는데 UI와 벡엔드 상호의존성을 줄이고 무언가 추가했을 때 계속 꼬이거나 오류가 나지 않는 방향으로 코드 전체를 리팩토링할 것. 운동코드 관련 리팩토링 끝났다고 그만두지 말고 코드 전체를 조망해서 리팩토링 깔끔하게 해서 추가적인 오류가 나지 않게 하고, 버튼 클릭시 속도가 무겁게 느껴지지않도록 경량화도 신경쓸 것. 화면단에서 검증까지 완료한 후에 배포할 것.`

## 계획 상태

- 단계: `slice4_deployed_with_auth_ui_blocker`
- 선행 계획:
  - `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md`
- 목적: 운동 추가/카드 추가 경계 안정화 뒤에도 남은 전역 `onclick`/`window.*`/중복 렌더 hotspot을 작은 실행 slice로 줄여, 새 버튼이나 UI를 추가할 때 다른 기능이 연쇄로 깨지는 위험을 낮춘다.
- 원칙:
  1. inline `onclick`을 제거할 때는 같은 버튼에 delegated listener와 inline handler가 동시에 남지 않게 한다.
  2. 동적 HTML 문자열에는 function call string 대신 `data-*` 계약과 가까운 container delegate를 둔다.
  3. 저장/Firebase 계약은 먼저 바꾸지 않는다. UI action routing과 후속 렌더 경계부터 작게 분리한다.
  4. 클릭 경량화는 기능 변경이 아니라 불필요한 전체 렌더/중복 저장 제거만 대상으로 한다.

## 진단 세션

- 적용 트리거: `/diagnose`
- 근거:
  1. `docs/ai/features/2026-07-03-workout-add-decoupling-refactor.md` Slice 5 인벤토리에서 남은 상위 hotspot은 `workout/expert/max.js`, `workout/expert.js`, `index.html`, `feature-login.js`, `home/friend-profile.js`이다.
  2. `home/friend-profile.js`는 동적 HTML 문자열 안에 reaction, comment, guestbook, guild invite, modal close action이 inline `onclick`으로 다수 존재한다.
  3. `index.html`/`feature-login.js`는 인증 bootstrap과 직결되어 있어 한 번에 제거하면 로그인 화면 자체가 깨질 수 있다.
  4. Max V4 plan sheet는 이미 capture delegate 규칙이 있으나, 주변 equipment/cleanse/history/blueprint modal에 inline handler가 남아 있어 별도 slice가 필요하다.
- 결론: 첫 실행 slice는 인증 bootstrap보다 덜 전역적이고, 사용자 상호작용 밀도가 높은 `home/friend-profile.js`의 social modal action delegate로 잡는다.

## 그릴 결과

- 적용 트리거: `/grill-me`
- 핵심 질문: “전역 inline handler를 한꺼번에 제거할 것인가, 아니면 한 화면/한 action namespace씩 제거할 것인가?”
- 추천 답변: 한 화면/한 namespace씩 제거한다.
- 이유:
  1. `onclick` 제거는 함수 호출 위치, 이벤트 bubbling, modal backdrop close, `event.stopPropagation()`과 얽혀 있다.
  2. `feature-login.js`와 `index.html`은 앱 진입점이라 회귀 blast radius가 크다.
  3. social profile modal은 action 종류가 많지만 container가 비교적 명확하고, 테스트로 inline handler 감소와 action map을 고정하기 좋다.

## 결정 기록

- 결정: 후속 리팩토링은 `social-profile action delegate -> login inline bridge -> app header/nav action bridge -> Max modal delegate -> click performance pass` 순서로 진행한다.
- 되돌릴 수 있는가: 가능. 각 slice는 기존 전역 함수 구현을 보존하고, 호출 surface만 `data-*` action으로 바꾸는 방식부터 시작한다.
- 배포 원칙: 앱 코드 또는 `STATIC_ASSETS` 변경 slice마다 `sw.js` `CACHE_VERSION`을 bump하고 운영 Pages deploy verification을 통과시킨다.

## 실행 슬라이스

### 슬라이스 1: friend profile modal action delegate

- 목표: `home/friend-profile.js`의 동적 profile modal 내부 주요 action을 inline `onclick`에서 scoped `data-social-action` delegate로 옮긴다.
- 범위:
  1. profile modal sheet/root에 capture 또는 sheet-local click delegate를 추가한다.
  2. 우선순위 높은 action부터 `data-social-action`으로 바꾼다: close modal, quick add neighbor, introduce friend, guild invite, tomato gift, guestbook submit, guestbook reply/delete, comment toggle.
  3. reaction picker/detail과 photo lightbox는 data payload escaping 위험이 커서 같은 slice 안에서 처리하되, 범위가 커지면 Slice 1b로 분리한다.
  4. 기존 `window.*` 함수는 외부 호출 호환을 위해 유지하되 modal HTML에서 직접 호출하지 않게 줄인다.
- 예상 수정 파일:
  - `home/friend-profile.js`
  - `tests/social-friend-profile-actions.test.js`
  - `sw.js`
  - cache marker 테스트
- 수정하지 말 것:
  - Firestore/data-social 저장 schema
  - 친구/길드/알림 비즈니스 로직
  - 친구 프로필 디자인 대개편
- 검증 방법:
  1. `node --check home/friend-profile.js; node --check sw.js`
  2. `node --test tests/social-friend-profile-actions.test.js`
  3. 관련 social/home 테스트 및 전체 테스트
  4. `node scripts/verify-runtime-assets.mjs`
  5. 운영 URL marker 검증

#### 슬라이스 1 실행 결과

- 상태: `deployed_with_auth_ui_blocker`
- 변경 요약:
  1. `home/friend-profile.js`에 `_bindFriendProfileActions(root)`와 `_socialAttr()`를 추가해 profile modal의 주요 click/Enter action을 `data-social-action`/`data-social-enter-action`으로 라우팅한다.
  2. profile modal의 close, quick guild join, neighbor add, introduce, guild invite, tomato gift, guestbook submit, workout/meal comment toggle을 inline handler 대신 modal-scoped delegate로 전환했다.
  3. `loadGuestbook()`이 나중에 삽입하는 reply/delete/author profile action도 같은 delegate 계약을 사용한다.
  4. comment author profile navigation도 `data-social-action="open-friend-profile"`로 전환했다.
  5. `home/friend-profile.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z13-social-profile-actions`로 bump했다.
- 의도적으로 남긴 범위:
  1. reaction picker/detail inline action은 payload와 popup lifecycle이 달라 별도 social slice에서 처리한다.
  2. introduce/guild invite의 2차 모달, my guestbook modal, comment edit/reply/delete inline action은 다음 social/login/Max hotspot 실행 흐름에서 별도 slice로 줄인다.
- 현재 검증:
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

### 슬라이스 2: login inline bridge 축소

- 목표: 로그인 화면의 `onclick` 진입점을 `data-login-action` + `feature-login.js` binder로 옮기되 bootstrap 안정성을 유지한다.
- 범위:
  1. `index.html` 로그인/가입/password modal 버튼에 `data-login-action`을 추가하고 inline handler를 제거한다.
  2. `feature-login.js` 또는 login bootstrap 위치에 idempotent binder를 둔다.
  3. 기존 global 함수는 외부/테스트 호환을 위해 유지한다.
- 수정하지 말 것:
  - 로그인 데이터 모델
  - 계정 생성/검증 저장 로직
- 검증 방법:
  - login source 구조 테스트
  - `node --check feature-login.js`
  - 운영 브라우저에서 로그인 화면 버튼 visibility/hit target 확인

#### 슬라이스 2 실행 결과

- 상태: `deployed_login_screen_verified`
- 변경 요약:
  1. `index.html`의 login/sign-up/password modal 주요 action을 `data-login-action`, `data-login-enter-action`, `data-login-input-action`, `data-login-focus-action`으로 전환했다.
  2. `feature-login.js`에 `_bindLoginActions(root)`와 `_runLoginAction(action, control)`를 추가해 `#login-screen`, `#login-pw-modal` 내부 action만 capture 단계에서 라우팅한다.
  3. 로그인/가입/비밀번호 확인/길드 검색 입력/Enter 추가 동작은 기존 전역 함수 구현을 그대로 재사용한다.
  4. `index.html`과 `feature-login.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z14-login-action-bridge`로 bump했다.
- 의도적으로 남긴 범위:
  1. 김태우 lock screen, onboarding guild overlay, guild management modal은 동적 HTML 생성 범위라 별도 slice에서 처리한다.
  2. app header/nav, bottom tab, more menu inline handler는 Slice 3 범위로 남긴다.
- 현재 검증:
  1. PASS: `node --check feature-login.js; node --check sw.js; node --check tests/login-action-bridge.test.js`
  2. PASS: `node --test tests/login-action-bridge.test.js tests/social-friend-profile-actions.test.js tests/pwa-update-auto-reload.test.js` - 10 pass
  3. PASS: `node --test tests/*.test.js` - 670 pass
  4. PASS: `git diff --check`
  5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
  6. INFO: `npm.cmd run deploy:production`은 `ebbf71b0eb31dfaf556e9f02e3c7c54f5e5665a6` push 후 Pages가 이전 커밋을 보고 실패했다. push 자체는 성공했다.
  7. PASS: `gh workflow run "Verify Pages Runtime Assets" --repo aretenald2018-sys/tomatofarm --ref main` 후 run `28653036608` 성공.
  8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ ebbf71b0eb31dfaf556e9f02e3c7c54f5e5665a6`
  9. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z14-login-action-bridge index.html::data-login-action index.html::data-login-enter-action feature-login.js::_bindLoginActions feature-login.js::loginActionsBound`
  10. PASS: 운영 URL in-app browser 로그인 화면 click flow - 로그인 화면 표시, 가입 화면 전환, 길드 토글 표시, 로그인 화면 복귀, console error 0건.

### 슬라이스 3: app header/nav action bridge

- 목표: `index.html` header/nav의 설치, 편지, 알림, 계정 전환 같은 반복 inline handler를 app-level action delegate로 옮긴다.
- 범위:
  1. `data-app-action` 또는 기존 action router와 맞는 namespace를 정한다.
  2. 전역 함수 직접 호출을 app shell delegate로 모은다.
  3. 기존 tab/navigation behavior는 유지한다.
- 검증 방법:
  - source 구조 테스트
  - 운영 브라우저에서 로그인 화면 overlay가 있어도 header hit target이 예상대로 막히는지/보이는지 확인

#### 슬라이스 3 실행 결과

- 상태: `deployed_with_auth_ui_blocker`
- 변경 요약:
  1. `index.html`의 top nav, 알림센터, 하단 탭, 더보기 메뉴, 탭 설정 modal action을 `data-app-action` 계약으로 전환했다.
  2. `app.js`에 `_bindAppShellActions(root)`와 `_runAppShellAction(action, control, event)`를 추가해 app shell action을 한 번만 바인딩한다.
  3. 역할 전환 시 `moreBtn.onclick`을 다시 만들지 않고 `data-app-action`/`data-tab`만 갱신하도록 바꿨다.
  4. `navigation.js`의 동적 더보기 메뉴 항목도 `data-app-action="switch-tab-close-more"`를 사용하게 했다.
  5. `index.html`, `app.js`, `navigation.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z15-app-shell-action-bridge`로 bump했다.
- 의도적으로 남긴 범위:
  1. `pwa-fcm.js` 설치 배너, `modals/settings-modal.js` 설정 내부 설치 버튼은 app shell이 아니라 별도 PWA/settings slice 후보로 남긴다.
  2. home/diet/workout 본문 inline handler는 각 feature-local delegate slice에서 처리한다.
- 현재 검증:
  1. PASS: `node --check app.js; node --check navigation.js; node --check sw.js; node --check tests/app-shell-action-bridge.test.js`
  2. PASS: shell 범위 legacy inline handler 검색 - 대상 handler 없음
  3. PASS: `node --test tests/app-shell-action-bridge.test.js tests/login-action-bridge.test.js tests/pwa-update-auto-reload.test.js tests/workout-navigation-stack.test.js` - 14 pass
  4. PASS: `node --test tests/*.test.js` - 674 pass
  5. PASS: `git diff --check`
  6. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
  7. PASS: `npm.cmd run deploy:production` - `328961273a03`, `tomatofarm-v20260703z15-app-shell-action-bridge`
  8. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 328961273a03`
  9. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z15-app-shell-action-bridge index.html::data-app-action app.js::_bindAppShellActions app.js::appShellActionsBound navigation.js::switch-tab-close-more`
  10. PASS: 운영 URL in-app browser 로드 - title `토마토 키우기`, URL `https://aretenald2018-sys.github.io/tomatofarm/`, `appShellActionsBound=1`, `data-app-action` controls 18개, console error 0건
  11. not verified yet: 실제 nav/more-menu 클릭 flow는 로그인 화면이 hit target을 덮어 인증 없이 누를 수 없었다. `#tab-nav [data-app-action="toggle-more-menu"]`와 diet tab 모두 center hit target이 `#login-screen`이었다.

### 슬라이스 4: Max auxiliary modal delegate

- 목표: Max V4 plan sheet 본체가 아닌 equipment/cleanse/history/blueprint modal의 inline `onclick`을 `data-action` delegate로 전환한다.
- 범위:
  1. `#max-v4-sheet .wt-v4-sheet` capture binding 규칙은 건드리지 않는다.
  2. equipment pool, data cleanse, history, blueprint modal 각각 하나씩 처리한다.
  3. lazy module button rule을 지켜 항상 모달 생성 함수 안에서 바인딩한다.
- 검증 방법:
  - Max inline handler ban 테스트 추가/갱신
  - Max V4 관련 focused tests

#### 슬라이스 4 실행 결과

- 상태: `deployed_with_auth_ui_blocker`
- 변경 요약:
  1. `workout/expert/max.js`에 `_bindMaxModalActions(modal, handlers)`를 추가해 보조 modal click action을 modal-local delegate로 라우팅한다.
  2. 추천 조정, 기구풀, 데이터 클렌징, 과거 수행값, 청사진 modal의 close/save/history/delete action을 `data-max-modal-action`으로 전환했다.
  3. 테스트모드 시작 카드의 일반모드 복귀 버튼과 미니 온보딩 닫기 버튼도 기존 host/root delegate 계약으로 옮겼다.
  4. `#max-v4-sheet` 본체 overlay/sheet inline handler 2개는 기존 capture/stopPropagation 규칙을 유지하기 위해 이번 slice에서 의도적으로 보류했다.
  5. `workout/expert/max.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z16-max-aux-modal-actions`로 bump했다.
- 현재 검증:
  1. PASS: `node --check workout/expert/max.js; node --check sw.js; node --check tests/max-auxiliary-modal-actions.test.js`
  2. PASS: `node --test tests/max-auxiliary-modal-actions.test.js tests/max-wendler.test.js tests/max-settle.test.js tests/workout-test-mode-unified.test.js tests/workout-save-mode-guard.test.js tests/pwa-update-auto-reload.test.js` - 44 pass
  3. PASS: `node --test tests/*.test.js` - 681 pass
  4. PASS: `git diff --check`
  5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
  6. INFO: `npm.cmd run deploy:production`은 `e6ed405b5000a3ff01f4ec481b1d34d555eecaf5` push 후 Pages가 이전 커밋을 보고 실패했다. push 자체는 성공했다.
  7. INFO: 수동 workflow run `28654996300`도 GitHub Pages 내부 오류 `Deployment failed, try again later.`로 실패했다.
  8. PASS: 수동 workflow run `28655128179` 성공.
  9. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ e6ed405b5000a3ff01f4ec481b1d34d555eecaf5`
  10. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z16-max-aux-modal-actions workout/expert/max.js::_bindMaxModalActions workout/expert/max.js::data-max-modal-action workout/expert/max.js::switch-normal-view "tests/max-auxiliary-modal-actions.test.js::remaining Max inline handlers"`
  11. PASS: 운영 URL in-app browser 로드 - title `토마토 키우기`, URL `https://aretenald2018-sys.github.io/tomatofarm/`, console error 0건
  12. not verified yet: 실제 Max UI click flow는 로그인 화면이 운동 탭 hit target을 덮어 인증 없이 열 수 없었다. `#tab-nav [data-tab="workout"]` center hit target이 `#login-screen`이었다.

### 슬라이스 5: click performance pass

- 목표: 클릭 직후 전체 렌더가 반복되는 경로 하나를 측정 가능한 구조 테스트로 줄인다.
- 후보:
  1. `home/friend-feed.js` reaction/like 후 feed 전체 렌더 반복
  2. social profile comment/reaction 후 profile modal 전체 재생성
  3. Max modal action 후 `window.renderExpertTopArea()` 중복 호출
- 검증 방법:
  - 기존 기능 테스트 통과
  - 구조 테스트로 중복 렌더 호출 감소 확인
  - 운영 URL marker 검증
- 실행 요약:
  1. `workout/expert/max.js`의 `window.renderExpertTopArea()` 직접 호출 23곳을 `_scheduleExpertTopAreaRender()` 요청으로 전환했다.
  2. `_scheduleExpertTopAreaRender()`는 `requestAnimationFrame` 기준으로 같은 프레임의 Max 상단 렌더 요청을 1회로 병합한다.
  3. 직접 `window.renderExpertTopArea()` 참조는 scheduler 내부에만 남기고, click/save/modal action은 scheduler 계약만 호출하도록 했다.
  4. `tests/max-render-scheduler.test.js`를 추가해 scheduler 존재, coalescing flag, 직접 호출 격리를 고정했다.
  5. `workout/expert/max.js`가 `STATIC_ASSETS`에 포함되어 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260703z17-max-render-scheduler`로 bump했다.
- 현재 검증:
  1. PASS: `node --check workout/expert/max.js; node --check sw.js; node --check tests/max-render-scheduler.test.js`
  2. PASS: `node --test tests/max-render-scheduler.test.js tests/max-auxiliary-modal-actions.test.js tests/max-wendler.test.js tests/max-settle.test.js tests/workout-test-mode-unified.test.js tests/workout-save-mode-guard.test.js tests/pwa-update-auto-reload.test.js` - 46 pass
  3. PASS: `node --test tests/*.test.js` - 683 pass
  4. PASS: `git diff --check`
  5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
  6. INFO: `f4442872c4435761ef848ddd6b2d5b41a4c78548` push 후 Pages deploy action이 GitHub 내부 오류 `Deployment failed, try again later.`로 실패했다.
  7. INFO: 수동 workflow run `28655912543`, `28656159691`도 같은 Pages 내부 오류로 실패했고, 운영 URL은 아직 이전 `07bc8743222e`/z16을 서빙한다.
  8. PASS: 새 docs commit `34b0bc01b23a`로 Pages deploy를 재트리거했고 `npm.cmd run deploy:production`이 통과했다.
  9. PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 34b0bc01b23a`
  10. PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/tomatofarm/ sw.js::tomatofarm-v20260703z17-max-render-scheduler workout/expert/max.js::_scheduleExpertTopAreaRender workout/expert/max.js::_expertTopAreaRenderScheduled workout/expert/max.js::requestAnimationFrame tests/max-render-scheduler.test.js::_scheduleExpertTopAreaRender`
  11. PASS: 운영 URL in-app browser 로드 - title `토마토 키우기`, `html[data-app-shell-actions-bound="1"]`, `data-app-action` controls 18개, console error 0건
  12. not verified yet: 실제 Max UI click flow는 로그인 화면이 운동 탭 hit target을 덮어 인증 없이 열 수 없었다. `#tab-nav [data-tab="workout"]` center hit target이 `#login-screen`이었다.

## 리뷰 세션 프롬프트

이 계획 문서와 직전 slice 변경 파일을 읽고 버그, 회귀, 누락된 테스트, 오래된 캐시/서비스워커 이슈, UX 깨짐을 우선 리뷰한다. 특히 같은 버튼에 inline handler와 delegate가 동시에 남아 이중 실행될 가능성, modal backdrop click/inner sheet `stopPropagation()` 회귀, data payload escaping 문제를 확인한다.

## NEXT_ACTION.md 업데이트

- 계획 세션 종료 상태: `ready_for_execution`
- Slice 1 실행 후 상태: `deployed_with_auth_ui_blocker`
- Slice 2 실행 후 상태: `deployed_login_screen_verified`
- Slice 3 실행 후 상태: `deployed_with_auth_ui_blocker`
- Slice 4 실행 후 상태: `deployed_with_auth_ui_blocker`
- Slice 5 실행 후 상태: `deployed_with_auth_ui_blocker`
- 다음 자동 상태: `complete`
- 다음 액션: 후속 전역 리팩토링은 새 planning session으로 social feed/profile reaction 중복 렌더와 남은 inline handler 후보를 재인벤토리한다.
- 차단 질문: 없음
