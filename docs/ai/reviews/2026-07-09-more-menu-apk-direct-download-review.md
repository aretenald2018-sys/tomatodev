# 더보기 메뉴 APK 직접 다운로드 리뷰

## 범위

- 계획: `docs/ai/features/2026-07-09-more-menu-apk-install.md`
- 리뷰 대상: 실행 Slice 2 `브라우저/PWA 직접 APK 다운로드`
- 사용자 피드백: Android 브라우저에서 `APK 설치하기`를 누를 때 warning toast가 뜨지 않고 APK가 바로 다운로드되어야 한다.

## 결론

PASS for local browser-flow, source contracts, runtime assets, and full Node regression suite. not verified yet for production Pages because the checkout already contains large unrelated dirty worktree changes, so committing/pushing now would risk deploying unrelated work.

## 변경 파일

1. `.gitignore` - 공개 APK asset만 추적하도록 `public/downloads/*.apk` 예외 추가.
2. `public/downloads/tomato-wear-debug.apk` - Pages에서 직접 받을 Wear debug APK.
3. `utils/build-info.js` - browser/PWA fallback을 warning toast에서 direct download로 변경.
4. `app.js` - helper-missing fallback도 direct APK URL로 변경.
5. `sw.js`, `build-info.json` - cache marker `tomatofarm-v20260709z8-direct-apk-download`.
6. `tests/wear-app-refresh-update.test.js` - RED/GREEN browser fallback download regression과 공개 asset/gitignore 계약 추가.
7. `tests/*.test.js` cache marker assertions - `z8`로 동기화.
8. `docs/ai/features/2026-07-09-more-menu-apk-install.md`, `docs/ai/reviews/2026-07-09-more-menu-apk-direct-download-review.md`, `docs/ai/NEXT_ACTION.md` - workflow handoff.

## 검토 결과

1. Goal: 브라우저/PWA에서 old warning toast 대신 APK 다운로드가 시작된다.
   - PASS. `requestTomatoApkInstall()`은 native bridge가 없으면 `_startTomatoApkDownload()`를 실행하고 `{ reason: 'browser-download' }`를 반환한다.

2. Native bridge 유지:
   - PASS. `TomatoWearAppUpdate.requestRefreshOrInstall()`가 있으면 기존 Wear refresh/install prompt 경로를 계속 탄다.

3. 공개 asset:
   - PASS. `public/downloads/tomato-wear-debug.apk`가 존재하고 `.gitignore` 예외가 있다.
   - Risk: debug APK를 공개 배포 asset으로 두는 결정은 사용자 요청에 따른 것이지만, production에 올리면 누구나 다운로드할 수 있다. 현재 파일은 debug signing/빌드 산출물임을 계속 인지해야 한다.

4. Cache/service worker:
   - PASS. `app.js`, `utils/build-info.js`는 `STATIC_ASSETS` 대상이므로 `sw.js` marker를 `tomatofarm-v20260709z8-direct-apk-download`로 bump했고 marker tests도 동기화했다.

5. UI/flow:
   - PASS. Browser-flow QA에서 `더보기 -> APK 설치하기` 실행 후 APK 요청/download가 발생했고 old warning toast는 없었다. 로컬 비로그인 harness에서는 로그인 overlay가 bottom tab을 덮으므로 overlay만 숨기고 사용자의 로그인된 screenshot 상태를 재현했다.

## 검증

1. PASS RED: `node --test tests/wear-app-refresh-update.test.js` - 구현 전 `TOMATO_WEAR_APK_DOWNLOAD_PATH` 부재와 browser download 미시작으로 실패.
2. PASS: `node --check app.js && node --check utils/build-info.js && node --check sw.js`.
3. PASS: `node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js` - 15 tests, 15 pass.
4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=913`.
5. PASS: `node --test tests/*.test.js` - 771 tests, 771 pass.
6. PASS browser-flow QA: `.omo/evidence/more-menu-apk-install/direct-download/result.json`.

## 남은 검증

not verified yet: production Pages URL `https://aretenald2018-sys.github.io/tomatofarm/`에서 직접 다운로드 flow는 아직 확인하지 않았다. 관련 변경만 안전하게 분리해 commit/push한 뒤 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`와 실제 Android 브라우저 `더보기 -> APK 설치하기` flow를 확인해야 한다.
