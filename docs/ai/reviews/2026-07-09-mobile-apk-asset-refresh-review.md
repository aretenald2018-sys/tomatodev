# 모바일 APK 최신 자산 재빌드 리뷰

## 대상

- 계획: `docs/ai/features/2026-07-09-more-menu-apk-install.md`
- 실행 slice: `실행 Slice 4: 모바일 APK 최신 자산 재빌드`
- 커밋: `ea2f3828c28c17e61cda5fa2935bc241a866501a`

## 검토 결과

PASS.

## 확인 사항

1. 사용자 증상인 “APK가 구버전처럼 보임”은 실제 APK 내부 `assets/public/sw.js`가 `tomatofarm-v20260709z4-more-menu-apk-deploy`였던 것으로 재현됐다.
2. 새 APK는 `assets/public/sw.js`와 `assets/public/build-info.json` 모두 `tomatofarm-v20260709z10-mobile-apk-download`를 담는다.
3. 새 APK 내부 `home/life-zone.js`에는 `data-lz-photo-like-key`와 저장형 `toggleLike(...)` 경로가 들어 있다.
4. 새 APK 내부 `style.css`에는 polygon 말풍선 꼬리와 투명 `.lz-photo-like-btn` 스타일이 들어 있다.
5. `tests/wear-app-refresh-update.test.js`가 APK zip 내부를 직접 검사하므로, 다음에 stale APK가 다시 복사되면 테스트가 실패한다.

## 검증

1. PASS RED: `node --test tests/wear-app-refresh-update.test.js` - 기존 APK 내부 `z4`와 root `z10` 불일치로 실패.
2. PASS: `JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" android/gradlew.bat -p android :app:assembleDebug` - `BUILD SUCCESSFUL`.
3. PASS: `node --test tests/wear-app-refresh-update.test.js` - 6 tests, 6 pass.
4. PASS: `npm.cmd run verify:assets` - `runtime-assets ok refs=903`.
5. PASS: `node --test tests/app-shell-action-bridge.test.js tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js` - 16 tests, 16 pass.
6. PASS: `node --test --test-concurrency=1 tests/*.test.js` - 772 tests, 772 pass.
7. PASS production deploy: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ ea2f382` - `[deploy-verify] ok ea2f3828c28c tomatofarm-v20260709z10-mobile-apk-download static=260`.
8. PASS production APK QA: production mobile APK `200`, `content-length=39511153`, wear APK `404`, downloaded APK 내부 최신 marker/JS/CSS 확인.

## 리스크와 남은 제약

1. 실제 Android 기기에 설치 후 화면 클릭까지는 이 환경에서 수행하지 못했다. 대신 production APK 파일 내부를 직접 검증했다.
2. 병렬 전체 테스트에서 `running-session-recovery-behavior.test.js` 1건이 일시 실패했으나, 해당 파일 단독 재실행은 2/2 pass였고 직렬 전체 실행은 772/772 pass였다.
3. 사용자가 기존 구버전 APK를 이미 설치한 상태라면 새 APK 설치 전 기존 앱 데이터/캐시가 남을 수 있다. 새 APK 설치 후에도 이상하면 기존 앱 삭제 후 재설치 또는 앱 데이터/캐시 삭제가 필요하다.
