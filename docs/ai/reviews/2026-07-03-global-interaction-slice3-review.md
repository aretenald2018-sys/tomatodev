# 2026-07-03 전역 상호작용 결합 완화 Slice 3 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-03-global-interaction-decoupling-refactor.md`
- 변경 파일:
  1. `index.html`
  2. `app.js`
  3. `navigation.js`
  4. `tests/app-shell-action-bridge.test.js`
  5. `sw.js`
  6. cache marker 테스트

## 결론

- 차단 이슈: 없음
- 판단: app shell의 top nav, 알림센터, bottom tab, more menu, tab settings modal이 `data-app-action` 계약과 `app.js`의 idempotent bridge로 이동해 HTML과 전역 함수 호출 문자열의 결합이 줄었다.

## 확인한 위험

1. 같은 버튼의 inline handler와 delegate 이중 실행
   - 확인 결과: shell slice에서 `onclick`이 제거됐고 `tests/app-shell-action-bridge.test.js`가 shell 범위 `onclick` 재도입을 막는다.

2. 역할 전환 시 dynamic nav가 다시 `onclick`을 주입하는 회귀
   - 확인 결과: `_syncNavigationForCurrentRole()`은 `moreBtn.onclick = null`로 정리하고 `data-app-action`/`data-tab`만 갱신한다.
   - `navigation.js`의 동적 more item도 `item.dataset.appAction = 'switch-tab-close-more'`만 설정한다.

3. tab settings modal inner sheet click이 backdrop close로 오인되는 회귀
   - 확인 결과: `_bindAppShellActions()`가 `control.id === 'tab-settings-modal' && event.target !== control`인 경우 close action을 무시한다.
   - save button은 더 가까운 `data-app-action="save-tab-settings"` control로 처리된다.

4. app shell delegate 범위 과확장
   - 확인 결과: `APP_SHELL_ACTION_SCOPE`가 `.top-nav`, `#notif-center`, `#notif-center-backdrop`, `#tab-nav`, `#more-menu`, `#tab-settings-modal`로 제한되어 home/diet/workout 본문 action과 섞이지 않는다.

## 남은 위험

1. `pwa-fcm.js` 설치 배너와 `modals/settings-modal.js` 내부 설치 버튼에는 inline handler가 남아 있다.
   - 판정: app shell 범위 밖. PWA/settings slice에서 별도 처리한다.

2. 실제 인증 후 편지/알림/계정 전환 flow는 자동으로 누르지 않는다.
   - 판정: 운영 배포 후 로그인 화면에서도 보이는 nav/more-menu 비파괴 flow를 확인하고, 인증 후 전역 action은 사용자 세션에서 후속 확인한다.

## 검증

1. PASS: `node --check app.js; node --check navigation.js; node --check sw.js; node --check tests/app-shell-action-bridge.test.js`
2. PASS: shell 범위 legacy inline handler 검색 - 대상 handler 없음
3. PASS: `node --test tests/app-shell-action-bridge.test.js tests/login-action-bridge.test.js tests/pwa-update-auto-reload.test.js tests/workout-navigation-stack.test.js` - 14 pass
4. PASS: `node --test tests/*.test.js` - 674 pass
5. PASS: `git diff --check`
6. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=875`
7. not verified yet: 운영 Pages 배포와 deployed marker/UI click flow 확인 필요
