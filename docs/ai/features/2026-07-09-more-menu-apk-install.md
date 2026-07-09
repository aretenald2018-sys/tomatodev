# 더보기 메뉴 APK 설치 버튼 계획

## 요청

하단바 `더보기`를 눌렀을 때 `APK 설치하기` 버튼을 제공하고, 사용자가 설치 흐름을 시작할 수 있게 한다.

## 그릴 결과

- 핵심 질문: 웹/PWA 버튼이 PC의 `adb install` 또는 로컬 debug APK sideload를 직접 실행할 수 있는가?
- 결정: 브라우저/PWA는 PC `adb`나 로컬 파일 시스템의 APK 설치를 직접 실행할 수 없다. 앱 내부 버튼은 Android Capacitor APK 안에서 기존 `TomatoWearAppUpdate.requestRefreshOrInstall()` native bridge를 호출해 paired Galaxy Watch 설치/업데이트 화면 또는 refresh ping을 실행한다.
- PWA/일반 브라우저 fallback: native bridge가 없으면 실제 APK 설치를 했다고 오인시키지 않고, Android APK에서 실행하거나 워치를 Wireless debugging으로 연결해 `npm.cmd run install:wear-watch`를 실행하라는 안내 toast를 보여준다.
- 남은 가정: 버튼 이름은 사용자 표현을 따라 `APK 설치하기`로 둔다. 실제 local debug sideload는 PC 터미널/ADB 권한이 필요하므로 UI 버튼만으로 무음 설치하지 않는다.

## 현재 코드 관찰

1. `index.html`의 `#more-menu`는 정적 sheet이고 `data-app-action` 기반으로 `app.js`가 위임 처리한다.
2. `app.js`의 `APP_SHELL_ACTION_SCOPE`는 `#more-menu`를 포함하고, `switch-tab-close-more`, `open-tab-settings-close-more` 등을 직접 처리한다.
3. `utils/build-info.js`에는 private `_requestWearAppRefreshOrInstall()`이 있고, `requestTomatoAppRefresh()`가 앱 새로고침 전에 이를 호출한다.
4. 새로고침 버튼 경로는 설치/업데이트 요청 후 페이지 reload까지 수행하므로, 더보기의 APK 설치 버튼은 reload 없는 별도 공개 함수가 필요하다.
5. `index.html`, `app.js`, `utils/build-info.js`, `style.css`는 service worker `STATIC_ASSETS`에 포함되어 변경 시 `sw.js` `CACHE_VERSION`을 bump해야 한다.

## 실행 Slice 1: 더보기 APK 설치 버튼

### 범위

1. `index.html`
   - `#more-menu` sheet에 `APK 설치하기` 버튼을 추가한다.
   - 버튼은 `data-app-action="install-apk"`를 사용하고 inline handler를 추가하지 않는다.

2. `app.js`
   - app shell action 목록에 `install-apk`를 추가한다.
   - 버튼 클릭 시 `window.__requestTomatoApkInstall({ control, source: 'more-menu' })`를 호출하고, 이후 더보기 메뉴를 닫는다.
   - helper가 없으면 toast/fallback으로 설치 불가 안내를 보여준다.

3. `utils/build-info.js`
   - private `_requestWearAppRefreshOrInstall()`을 재사용해 reload 없는 `requestTomatoApkInstall()` export를 추가한다.
   - native bridge가 없으면 `installed=false`, `reason='native-bridge-unavailable'` 결과와 안내 toast를 반환한다.
   - 성공/대기/실패 toast는 기존 app refresh toast 스타일을 따른다.

4. `style.css`
   - 필요 시 `.more-menu-item` 안의 보조 설명/상태 스타일만 Seed/TDS 토큰으로 추가한다.
   - 새 raw hex나 장식성 motion은 추가하지 않는다.

5. `styles/components.css`
   - 기존 `.tab-icon.nav-icon` mask 체계를 유지하면서 APK 설치 버튼 아이콘을 추가한다.
   - 새 runtime asset 파일을 늘리지 않아 `verify:assets`가 untracked asset으로 실패하지 않게 한다.

6. `sw.js`
   - `CACHE_VERSION`을 bump한다.

7. Tests
   - `tests/app-shell-action-bridge.test.js`에 `install-apk` action/markup/handler 계약을 추가한다.
   - `tests/wear-app-refresh-update.test.js` 또는 focused test에 `requestTomatoApkInstall`, native bridge fallback, reload 미호출 계약을 추가한다.

### 하지 않는 것

- PC `adb install`을 브라우저에서 직접 실행하지 않는다.
- Play Store 미등록 상태를 숨기고 “설치 완료”로 표시하지 않는다.
- phone/watch debug APK를 `www/` 또는 production Pages 정적 자산으로 복사하지 않는다.
- 기존 새로고침 버튼 동작을 바꾸지 않는다.

## 검증 계획

1. RED: `node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js`.
2. PASS 목표: `node --check app.js && node --check utils/build-info.js && node --check sw.js`.
3. PASS 목표: `node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js`.
4. PASS 목표: `npm.cmd run verify:assets`.
5. UI QA: 더보기 버튼 클릭 -> `APK 설치하기` 버튼 표시 -> 클릭 시 메뉴가 닫히고 native bridge가 없으면 fallback toast가 표시되는지 브라우저에서 확인한다. Android APK/native bridge 실제 설치 flow는 paired phone/watch가 ADB offline이면 `not verified yet`으로 남긴다.

## 실행 결과 (2026-07-09)

1. `index.html`의 더보기 sheet에 `APK 설치하기` 버튼을 추가했다.
2. `app.js`의 app shell action bridge에 `install-apk` case를 추가했다.
3. `utils/build-info.js`에 reload 없는 `requestTomatoApkInstall()`을 추가하고 `window.__requestTomatoApkInstall`로 노출했다.
4. 브라우저/PWA fallback과 Wear native failures 모두 `npm.cmd run install:wear-watch` 안내로 분기해, Play Store 미등록 앱인데도 설치 완료처럼 보이지 않게 했다.
5. `styles/components.css`에 APK 아이콘 mask를 추가했고 `sw.js` cache version을 `tomatofarm-v20260709z4-more-menu-apk-deploy`로 갱신했다.
6. PASS: `git diff --check; node --check app.js && node --check utils/build-info.js && node --check sw.js && npm.cmd run verify:assets && node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js`.
7. PASS: `node --test tests/pwa-update-auto-reload.test.js tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js`.
8. 모바일앱 반영: `node scripts/copy-www.js && npx.cmd cap sync android`로 `www/`와 `android/app/src/main/assets/public/`에 변경을 동기화했다.
9. 모바일앱 blocker 수정: `scripts/copy-www.js`에 `calc/`, `expert-mode.css`, `test-mode-v2.css` 복사를 추가했다. 이 누락 때문에 모바일 WebView에서 `data.js` import가 실패하고 app shell click handler가 붙지 않았다.
10. PASS: `git diff --check; node --check app.js && node --check utils/build-info.js && node --check sw.js && node --check scripts/copy-www.js && npm.cmd run verify:assets && node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js tests/copy-www-mobile-assets.test.js`.
11. PASS mobile WebView QA: `android/app/src/main/assets/public`를 임시 HTTP server로 서빙하고 390x844 viewport에서 `더보기 -> APK 설치하기` 클릭을 확인했다. Evidence: `.omo/evidence/more-menu-apk-install/mobile-app-more-menu-apk-open.png`, `.omo/evidence/more-menu-apk-install/mobile-app-more-menu-apk-after-click.png`.
12. not verified yet: 실제 Android phone APK의 native `TomatoWearAppUpdate` plugin이 Galaxy Watch 설치/refresh 요청을 수행하는 실기기 flow는 이번 세션에서 실행하지 않았다.

## 배포 누락 수정 (2026-07-09)

1. 사용자 제보 스크린샷에서 운영 화면의 더보기 sheet가 `통계`, `요리`, `탭 설정`만 표시하고 `APK 설치하기`가 없는 것을 확인했다.
2. 진단 결과 로컬 root, `www/`, `android/app/src/main/assets/public/`에는 버튼이 있었지만 production Pages `index.html`에는 없었고, production `sw.js`도 `tomatofarm-v20260709z2-diet-recent-compact`를 서빙 중이었다.
3. `sw.js` cache version과 관련 marker tests를 `tomatofarm-v20260709z4-more-menu-apk-deploy`로 갱신해 운영 SW가 새 app shell을 받도록 했다.
4. `node scripts/copy-www.js`와 `npx.cmd cap sync android`를 다시 실행해 로컬 모바일 asset 산출물에도 같은 marker와 버튼을 반영했다.
5. 검증:
   - FAIL 재현: `curl -L -s https://aretenald2018-sys.github.io/tomatofarm/index.html | rg -n "APK 설치하기|data-app-action=\"install-apk\""`가 배포 전 exit 1.
   - PASS: `git diff --check && node --check app.js && node --check utils/build-info.js && node --check sw.js && npm.cmd run verify:assets && node --test tests/app-shell-action-bridge.test.js tests/pwa-update-auto-reload.test.js tests/wear-app-refresh-update.test.js`.
   - PASS: `node --test tests/copy-www-mobile-assets.test.js`.
6. 다음 검증: APK-menu 관련 변경만 commit/push한 뒤 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`와 production browser flow(`더보기 -> APK 설치하기`)를 확인한다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-09-more-menu-apk-install.md`의 실행 Slice 1을 구현한다. 기존 app shell `data-app-action` 패턴을 따르고, `STATIC_ASSETS` 변경에 맞춰 `sw.js` cache version을 bump한다.
