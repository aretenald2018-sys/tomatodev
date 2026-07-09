# WearOS 앱 새로고침 업데이트/설치 연동 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-07-08-wear-app-refresh-update-install.md`
- 실행 slice: 헤더 새로고침 -> WearOS update/install prompt bridge
- 핵심 변경:
  - `utils/build-info.js`
  - `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearAppUpdatePlugin.kt`
  - `android/wear/src/main/java/com/lifestreak/wear/workout/WearAppRefreshListenerService.kt`
  - `android/wear/src/main/res/values/wear.xml`
  - `scripts/verify-wear-refresh-adb.mjs`
  - `package.json`

## 결론

리뷰 결과는 `not verified yet`이다.

정적 구현, Android compile, Node tests, asset verification, security re-review는 통과했다. 하지만 원래 목표인 "앱 새로고침 누를 때마다 Galaxy Watch에도 업데이트 신호가 가고, 설치되어 있지 않으면 다운로드 화면을 열게 한다"는 실제 paired phone/Galaxy Watch에서만 증명할 수 있다.

현재 세션에서 `adb`는 발견되었지만 attached device가 0개라 installed-watch 수신과 missing-watch install prompt를 직접 검증하지 못했다.

## 확인된 사항

1. Phone 앱의 `requestTomatoAppRefresh()`는 reload 전에 `TomatoWearAppUpdate.requestRefreshOrInstall(...)`을 호출한다.
2. Phone native plugin은 connected nodes와 `tomato_farm_wear_app` capability를 기준으로 installed/missing watch를 분리한다.
3. Installed watch에는 `/tomato/app/refresh` message를 보낸다.
4. Missing watch에는 `RemoteActivityHelper`로 `market://details?id=com.lifestreak.app`를 연다.
5. Watch listener는 `/tomato/app/refresh` payload를 2048 bytes로 제한한 뒤 local SharedPreferences receipt로 저장한다.
6. `.gitignore`는 이번 slice의 정확한 native source files만 노출하고, app-local secret probes는 계속 ignore한다.
7. `scripts/verify-wear-refresh-adb.mjs`와 `npm.cmd run verify:wear-refresh -- ...`가 paired-device evidence 수집 경로로 추가됐다.
8. 사용자 피드백 후 `npm.cmd run install:wear-pair`가 추가됐다. local/debug 환경에서는 이 명령으로 phone/watch APK를 명시적으로 sideload해야 한다. Galaxy Wearable 연결만으로는 충분하지 않고, phone/watch가 PC의 `adb devices -l`에 보여야 한다.
9. 사용자 피드백 후 `npm.cmd run install:wear-watch`가 추가됐다. 워치 아이콘/앱 설치만 목적이면 phone 연결 없이 ADB-visible Galaxy Watch에 `wear-debug.apk`만 직접 설치한다.

## 검증 증거

1. PASS: `node --test tests/wear-app-refresh-update.test.js` - 3 tests, 3 pass.
2. PASS: `node --check scripts/verify-wear-refresh-adb.mjs`.
3. PASS: `git diff --check` exit 0.
4. PASS: previous full static suite and Android Gradle evidence는 `.omo/evidence/wear-app-refresh-update-install/`에 기록되어 있다.
5. not verified yet: `npm.cmd run verify:wear-refresh -- --mode probe` found `adb` but `deviceCount=0`. Evidence: `.omo/evidence/wear-app-refresh-update-install/adb-device-probe-latest.txt`.

## 남은 필수 검증

1. Installed watch path:
   - debug APK가 없으면 먼저 `.\android\gradlew.bat -p android :app:assembleDebug :wear:assembleDebug`
   - 워치 앱만 설치하면 `npm.cmd run install:wear-watch`
   - phone/watch가 ADB에 하나씩 보이면 `npm.cmd run install:wear-pair`; 자동 판별이 안 되면 `npm.cmd run install:wear-pair -- --phone PHONE_SERIAL --watch WATCH_SERIAL`
   - `.omo/evidence/wear-app-refresh-update-install/wear-pair-install-adb-verification.txt`에서 `watchPackageInstalledAfter=true` 확인
   - `npm.cmd run verify:wear-refresh -- --mode installed`
   - script가 대기하는 동안 phone 앱 헤더 `#app-refresh-btn` 클릭
   - `.omo/evidence/wear-app-refresh-update-install/installed-node-adb-verification.txt`에서 fresh `last_received_at` 확인
2. Missing watch app path:
   - paired watch에서 `com.lifestreak.app` watch 앱 제거
   - `npm.cmd run verify:wear-refresh -- --mode missing --phone PHONE_SERIAL --watch WATCH_SERIAL`
   - script가 대기하는 동안 phone 앱 헤더 `#app-refresh-btn` 클릭
   - `.omo/evidence/wear-app-refresh-update-install/missing-watch-install-prompt-adb-verification.txt`와 screenshot에서 Wear Play Store foreground 확인

## 리뷰 판정

`ready_for_paired_device_qa`.

Watch-only local install은 PASS다. 폰 앱 새로고침 버튼이 설치된 워치에 refresh ping을 보내는 end-to-end 검증은 phone ADB 연결 후 남아 있다.
