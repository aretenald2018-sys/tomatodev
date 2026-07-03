# 2026-07-03 전역 상호작용 결합 완화 Slice 2 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-global-interaction-decoupling-refactor.md`
- 변경 파일:
  1. `index.html`
  2. `feature-login.js`
  3. `tests/login-action-bridge.test.js`
  4. `sw.js`
  5. cache marker 테스트

## 결론

- 차단 이슈: 없음
- 판단: 로그인/가입/비밀번호 모달의 주요 action이 `data-login-*` 계약과 `feature-login.js`의 idempotent bridge로 이동해, login HTML과 전역 함수 호출 문자열의 결합이 줄었다.

## 확인한 위험

1. 로그인 bootstrap 순서 회귀
   - 확인 결과: `DOMContentLoaded`에서 `_bindLoginActions()`를 먼저 idempotent하게 바인딩한 뒤 `initLoginScreen()`을 호출한다.
   - 기존 `initLoginScreen()`의 async 로그인 복구/잠금 화면 흐름은 건드리지 않았다.

2. delegate 범위 과확장
   - 확인 결과: `_isLoginBridgeScope(control)`이 `#login-screen`, `#login-pw-modal` 내부 action만 처리한다.
   - 따라서 header/nav/home/diet 등 다음 slice의 inline handler와 섞이지 않는다.

3. Enter/input/focus 동작 회귀
   - 확인 결과: password Enter, password modal Enter, signup guild input search/focus/add chip이 `data-login-enter-action`, `data-login-input-action`, `data-login-focus-action`으로 보존됐다.

## 남은 위험

1. 김태우 lock screen, onboarding guild overlay, guild management modal의 동적 HTML inline handler는 남아 있다.
   - 판정: 이번 Slice 2 범위 밖. login bootstrap 안정성을 위해 정적 login screen부터 분리했다.

2. 실제 로그인 수행 flow는 인증/개인정보 입력 없이 자동 검증하지 않는다.
   - 판정: 운영 배포 후 로그인 화면의 버튼 전환/비밀번호 modal visibility까지만 비파괴적으로 확인하고, 실제 계정 로그인은 사용자 인증 세션에서 확인한다.

## 검증

1. PASS: `node --check feature-login.js; node --check sw.js; node --check tests/login-action-bridge.test.js`
2. PASS: `node --test tests/login-action-bridge.test.js tests/social-friend-profile-actions.test.js tests/pwa-update-auto-reload.test.js` - 10 pass
3. PASS: `node --test tests/*.test.js` - 670 pass
4. PASS: `git diff --check`
5. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
6. not verified yet: 운영 배포 marker 검증과 실제 로그인 화면 click flow 검증
