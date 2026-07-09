# 더보기 메뉴 모바일 APK 다운로드 수정 리뷰

## Verdict

PASS for production Pages deploy, production browser-flow QA, focused regression tests, full Node regression suite, and documentation handoff.

## 범위

- 계획: `docs/ai/features/2026-07-09-more-menu-apk-install.md`
- 리뷰 대상: 실행 Slice 3 `모바일 APK 다운로드 대상 고정`
- 사용자 피드백: `APK 설치하기`가 토마토 모바일 앱 APK가 아니라 갤럭시워치용 APK를 설치/다운로드한다.

## 변경 파일

1. `public/downloads/tomato-mobile-debug.apk` - Pages에서 직접 받을 토마토 모바일 debug APK. 원본은 `android/app/build/outputs/apk/debug/app-debug.apk`, 크기는 `50,133,878 bytes`.
2. `public/downloads/tomato-wear-debug.apk` - 공개 배포에서 제거.
3. `utils/build-info.js` - mobile APK 다운로드 상수와 helper로 변경, `requestTomatoApkInstall()`에서 Wear native bridge 호출 제거.
4. `app.js` - helper-missing fallback을 `public/downloads/tomato-mobile-debug.apk`로 변경.
5. `sw.js` - cache marker `tomatofarm-v20260709z10-mobile-apk-download`.
6. `tests/wear-app-refresh-update.test.js` - mobile APK asset, Wear APK 제거, Wear bridge 미호출 계약 추가.
7. `tests/*.test.js` cache marker assertions - `z10`으로 동기화.
8. `docs/ai/features/2026-07-09-more-menu-apk-install.md`, `docs/ai/NEXT_ACTION.md` - 최신 handoff와 이전 Wear APK 기록 superseded 표시.

## 리뷰 결과

1. Goal: `APK 설치하기`가 토마토 모바일 APK를 다운로드한다.
   - PASS. `requestTomatoApkInstall()`은 `_startTomatoApkDownload()`만 호출하고 다운로드 파일명은 `tomato-mobile-debug.apk`다.

2. Goal: 갤럭시워치용 APK가 설치/다운로드되지 않는다.
   - PASS. `public/downloads/tomato-wear-debug.apk`는 repo와 production Pages에서 제거됐고 production QA에서 `404`를 확인했다.

3. Constraint: Wear refresh/install 기능은 필요한 곳에만 남긴다.
   - PASS. `requestTomatoAppRefresh()`는 `_requestWearAppRefreshOrInstall()`을 계속 호출하지만, `requestTomatoApkInstall()`은 Wear bridge를 호출하지 않는다.

4. Constraint: `STATIC_ASSETS` 변경에 맞춰 service worker cache를 bump한다.
   - PASS. `sw.js`와 marker tests가 `tomatofarm-v20260709z10-mobile-apk-download`로 동기화됐다.

5. Documentation consistency:
   - PASS after fix. 이전 Wear APK 직접 다운로드 리뷰와 초기 버튼 리뷰는 historical record로 표시했고, 현재 기준 리뷰를 이 문서로 분리했다.

6. Anti-slop / overfit review:
   - PASS after fix. `tests/wear-app-refresh-update.test.js`에서 private constant 이름과 helper body substring에 기대던 assertions를 제거했고, 실제 module import + fake DOM + fake Wear bridge로 `requestTomatoApkInstall()`의 모바일 APK 다운로드와 Wear bridge 미호출을 검증한다. 남은 source assertions는 공개 fallback URL, 공개 APK asset 존재/부재, service worker cache marker, refresh bridge ordering 같은 계약 수준으로 제한했다.

## 검증

1. PASS RED: `node --test tests/wear-app-refresh-update.test.js`가 구현 전 모바일 APK 상수/asset 부재와 Wear bridge 호출로 실패했다.
2. PASS: `git diff --check; node --check app.js; node --check utils/build-info.js; node --check sw.js`.
3. PASS: `node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js` - 15 tests, 15 pass.
4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=903`.
5. PASS: 현재 작업 루트에서 전체 test file 목록을 명시해 `node --test <all tests>` 실행 - 771 tests, 771 pass.
6. PASS production deploy: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ 25da0a3` - `[deploy-verify] ok 25da0a3595d6 tomatofarm-v20260709z10-mobile-apk-download static=260`.
7. PASS production browser QA: 390x844 Android viewport에서 `더보기 -> APK 설치하기` 클릭. `tomato-mobile-debug.apk`가 `50,133,878 bytes`로 다운로드됐고, old warning은 없었으며, `public/downloads/tomato-wear-debug.apk`는 `404`였다. Evidence: `.omo/evidence/more-menu-apk-install/production-mobile-apk-25da0a3/result.json`, `menu-open.png`, `after-click.png`.
8. PASS gate fix: `node --test tests/wear-app-refresh-update.test.js` - 5 tests, 5 pass after reducing source-string overfit.

## 남은 리스크

Debug APK를 공개 Pages asset으로 배포한다는 결정 자체는 사용자의 직접 다운로드 요구에 따른 것이다. release signing/배포 채널이 별도로 필요해지면 이 asset을 release APK로 바꾸는 별도 계획이 필요하다.
