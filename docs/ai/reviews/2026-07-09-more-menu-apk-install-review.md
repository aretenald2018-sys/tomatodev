# 더보기 메뉴 APK 설치 버튼 리뷰

## Verdict

PASS for mobile WebView UI, generated Android assets, and static/contracts. not verified yet for real phone APK native bridge to Galaxy Watch.

## 변경 파일

1. `index.html` - 더보기 sheet에 `APK 설치하기` 버튼 추가.
2. `app.js` - app shell `install-apk` action 추가.
3. `utils/build-info.js` - reload 없는 `requestTomatoApkInstall()` export와 window binding 추가.
4. `styles/components.css` - APK 아이콘 mask 추가.
5. `sw.js` - cache version `tomatofarm-v20260709z4-more-menu-apk-deploy` 반영.
6. `tests/app-shell-action-bridge.test.js`, `tests/wear-app-refresh-update.test.js`, `tests/pwa-update-auto-reload.test.js` - action/cache/native fallback 계약 갱신.
7. `scripts/copy-www.js`, `tests/copy-www-mobile-assets.test.js` - 모바일앱 WebView asset 복사 누락 방지.
8. generated `www/**`, `android/app/src/main/assets/public/**` - `node scripts/copy-www.js && npx.cmd cap sync android`로 모바일앱 asset sync.
9. `docs/ai/NEXT_ACTION.md`, `docs/ai/features/2026-07-09-more-menu-apk-install.md` - 계획/핸드오프 갱신.

## 리뷰 결과

1. Goal: 하단바 더보기 메뉴에서 `APK 설치하기` 버튼이 보이고 app shell action으로 처리된다.
2. Constraint: inline handler를 추가하지 않았고 기존 `data-app-action` 위임 패턴을 따른다.
3. Constraint: 브라우저/PWA에서 PC `adb install`을 실행한다고 속이지 않는다. native bridge가 없거나 설치 prompt가 실패하면 `npm.cmd run install:wear-watch` 안내를 띄운다.
4. Constraint: `STATIC_ASSETS` 변경에 맞춰 `sw.js` cache version을 bump했고 `npm.cmd run verify:assets`가 통과했다.
5. Mobile app: root 변경을 `www/`와 `android/app/src/main/assets/public/`로 sync했다. `android/app/src/main/assets/public/index.html`, `app.js`, `utils/build-info.js`, `styles/components.css`, `sw.js`에 `APK 설치하기` 변경이 반영되어 있다.
6. Blocker fixed: `scripts/copy-www.js`가 `calc/volume.js` 등 모바일 런타임 dependency를 누락해 app shell module이 실패하던 문제를 고쳤다.
7. Risk: Play Store 미등록 앱이라 Android native bridge의 remote install prompt만으로는 실제 Wear APK sideload가 되지 않을 수 있다. 이 경우 PC에서 `npm.cmd run install:wear-watch`가 여전히 실제 설치 경로다.

## 검증

1. PASS: `git diff --check; node --check app.js && node --check utils/build-info.js && node --check sw.js && npm.cmd run verify:assets && node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js`.
2. PASS: `node --test tests/pwa-update-auto-reload.test.js tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js`.
3. PASS: `git diff --check; node --check app.js && node --check utils/build-info.js && node --check sw.js && node --check scripts/copy-www.js && npm.cmd run verify:assets && node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js tests/copy-www-mobile-assets.test.js`.
4. PASS mobile WebView QA: `android/app/src/main/assets/public`를 임시 HTTP server로 서빙하고 390x844 viewport에서 `더보기 -> APK 설치하기` 클릭을 확인했다. 메뉴가 열리고 label=`APK 설치하기`, 클릭 후 메뉴가 닫히며 fallback toast가 기록됐다.
5. Evidence: `.omo/evidence/more-menu-apk-install/mobile-app-more-menu-apk-open.png`, `.omo/evidence/more-menu-apk-install/mobile-app-more-menu-apk-after-click.png`.

## 미검증

not verified yet: 실제 Android phone APK에서 native `TomatoWearAppUpdate` plugin이 Galaxy Watch 설치/refresh 요청을 수행하는 실기기 flow는 이번 세션에서 실행하지 않았다.

## 배포 누락 재리뷰 (2026-07-09)

## Verdict

PASS for source/mobile asset marker consistency and focused tests. Production Pages verification remains pending until the new commit is pushed and Pages finishes deploying.

## Findings

1. Root cause: production `index.html` did not contain `APK 설치하기` or `data-app-action="install-apk"` even though local root, `www/`, and Android WebView assets did.
2. Cache: production `sw.js` was still `tomatofarm-v20260709z2-diet-recent-compact`; local source is now `tomatofarm-v20260709z4-more-menu-apk-deploy`.
3. Mobile generated assets: `node scripts/copy-www.js` and `npx.cmd cap sync android` copied the z4 marker and button into `www/` and `android/app/src/main/assets/public/`.

## 검증

1. FAIL 재현: deployed `index.html` marker search for `APK 설치하기|data-app-action="install-apk"` returned no matches before deploy.
2. PASS: `git diff --check && node --check app.js && node --check utils/build-info.js && node --check sw.js && npm.cmd run verify:assets && node --test tests/app-shell-action-bridge.test.js tests/pwa-update-auto-reload.test.js tests/wear-app-refresh-update.test.js`.
3. PASS: `node --test tests/copy-www-mobile-assets.test.js`.
