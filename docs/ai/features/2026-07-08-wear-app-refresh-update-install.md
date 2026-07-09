# WearOS 앱 새로고침 업데이트/설치 연동 계획

## 요청

앱 상단 새로고침 버튼을 누를 때마다 WearOS/Galaxy Watch 쪽도 함께 업데이트 흐름을 타게 하고, 워치에 Tomato Farm 앱이 설치되어 있지 않으면 다운로드할 수 있게 처리한다.

## 현재 코드 관찰

1. 헤더 새로고침 버튼은 `index.html`의 `#app-refresh-btn`과 `app.js`의 `data-app-action="refresh-app-update"` bridge를 통해 `utils/build-info.js`의 `requestTomatoAppRefresh()`를 호출한다.
2. `requestTomatoAppRefresh()`는 Service Worker 최신 등록을 확인하고 `waiting` worker가 있으면 `SKIP_WAITING` 후 reload, 없으면 일반 reload를 수행한다.
3. Android phone 앱은 `MainActivity.java`에서 `TomatoWearWorkoutBridge`를 등록해 워치 운동 payload를 WebView로 drain한다.
4. 현재 Wear Data Layer 방향은 watch -> phone 운동 저장 전송(`/tomato/workout/run/complete`)뿐이다. phone refresh -> watch 업데이트/설치 확인 경로는 없다.
5. `android/app/build.gradle`과 `android/wear/build.gradle`은 둘 다 `applicationId "com.lifestreak.app"`이고 `play-services-wearable:18.2.0`을 사용한다. 이는 Data Layer의 package/signature 일치 조건과 맞는다.
6. `android/wear/src/main/AndroidManifest.xml`에는 watch 앱 식별용 `<uses-feature android:name="android.hardware.type.watch" />`가 있으나, watch capability 광고(`res/values/wear.xml`)는 아직 없다.
7. `NEXT_ACTION.md`의 Wear Running Only Shell 리뷰 결과에 따르면 `.gitignore`의 `android/` 규칙 때문에 새 native Wear 파일이 git diff/commit 대상에 빠질 위험이 있다. native 실행 slice는 먼저 Android source tracking 정책을 바로잡아야 한다.

## 공식 문서 기준

1. Wear OS Data Layer는 paired Android phone과 Wear OS watch 사이 통신 채널이며, package name과 signing signature가 양쪽에서 같아야 한다.
2. `MessageClient`는 작은 one-way RPC에 적합하지만 persistence/retry가 없으므로, 앱 refresh ping처럼 즉시성 신호에만 사용한다.
3. Android phone은 `NodeClient`로 연결된 watch를 찾고, `CapabilityClient`로 watch 앱 설치 여부를 감지할 수 있다.
4. watch 앱이 없는 device에는 phone에서 `RemoteActivityHelper.startRemoteActivity()`로 Wear OS Play Store의 `market://details?id=com.lifestreak.app` listing을 열어 설치/업데이트를 유도한다.
5. 무음 설치나 무음 업데이트는 구현하지 않는다. 사용자가 Play Store 화면에서 설치/업데이트를 완료해야 한다.
6. Capacitor custom native 기능은 local Android plugin을 만들고 `MainActivity.java`에서 `registerPlugin()`으로 등록한 뒤 JS에서 `window.Capacitor.Plugins.<name>`로 호출한다.

참고 링크:

- https://developer.android.com/training/wearables/data/overview
- https://developer.android.com/training/wearables/data/client-types
- https://developer.android.com/training/wearables/apps/standalone-apps
- https://developer.android.com/reference/androidx/wear/remote/interactions/RemoteActivityHelper
- https://capacitorjs.com/docs/android/custom-code
- https://developer.android.com/jetpack/androidx/releases/wear

## 그릴 결과

- 핵심 질문: “다운받게끔”을 조용한 자동 설치로 해석할 수 있는가?
- 결정: 플랫폼상 조용한 자동 설치/업데이트는 하지 않는다. 새로고침 클릭마다 phone 앱이 paired watch를 검사하고, 설치되지 않은 watch에는 Play Store 설치 화면을 원격으로 연다.
- 핵심 질문: 이미 설치된 watch에는 무엇을 해야 하는가?
- 결정: 이미 설치된 watch에는 `/tomato/app/refresh` Data Layer message를 보내 앱 refresh/update ping을 전달한다. 이 ping은 watch 앱이 설치되어 있고 reachable하다는 증거이며, binary update 자체는 Play Store 업데이트 메커니즘에 맡긴다.
- 핵심 질문: 기존 running POC 저장 bridge를 재사용할 것인가?
- 결정: 운동 저장 bridge(`TomatoWearWorkoutBridge`, `workout/wear-bridge.js`)와 섞지 않는다. app refresh/install은 별도 phone-side native plugin과 watch-side listener로 분리한다.
- 남은 가정: watch 앱 Play Store listing id는 현재 Android `applicationId`와 같은 `com.lifestreak.app`이다. Play Store에 listing이 없거나 internal track 접근 권한이 없으면 remote install prompt는 열릴 수 있어도 실제 다운로드는 완료되지 않을 수 있다.

## 실행 Slice 1: 헤더 새로고침 -> WearOS update/install prompt bridge

### 범위

1. Android source tracking prerequisite
   - `.gitignore`의 `android/` blanket ignore가 새 native source/resource를 숨기지 않도록 필요한 예외를 추가한다.
   - 최소 대상은 `android/app/src/main/java/com/lifestreak/app/wear/**`, `android/wear/src/main/java/**`, `android/wear/src/main/res/**`, `android/app/build.gradle`, `android/wear/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/wear/src/main/AndroidManifest.xml`이다.
   - 기존 `www/` build artifact 직접 수정 금지는 유지한다.

2. Phone native plugin
   - `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearAppUpdatePlugin.kt`를 추가한다.
   - `@CapacitorPlugin(name = "TomatoWearAppUpdate")`와 `@PluginMethod requestRefreshOrInstall(call)`을 제공한다.
   - `MainActivity.java`는 `registerPlugin(TomatoWearAppUpdatePlugin.class)`를 `super.onCreate(savedInstanceState)` 전에 등록한다.
   - plugin은 `NodeClient.connectedNodes`와 `CapabilityClient.getCapability("tomato_farm_wear_app", FILTER_REACHABLE)`를 사용해 connected watch 중 앱 설치 node와 미설치 node를 분리한다.
   - 설치된 node에는 `MessageClient.sendMessage(node.id, "/tomato/app/refresh", payloadBytes)`를 보낸다.
   - 미설치 node에는 `RemoteActivityHelper`로 `Intent.ACTION_VIEW`, `Intent.CATEGORY_BROWSABLE`, `market://details?id=com.lifestreak.app`를 해당 node에 연다.
   - JS로 `{ connectedNodes, installedNodes, refreshSent, installPrompted, failures }` 형태의 요약을 resolve한다.

3. Native dependencies
   - `android/app/build.gradle`에 `androidx.wear:wear-remote-interactions:1.2.0`을 추가한다.
   - 기존 `play-services-wearable:18.2.0`은 이번 slice에서 불필요하게 업그레이드하지 않는다. compile 실패가 해당 버전 때문으로 확인될 때만 최소 업그레이드한다.

4. Watch capability/listener
   - `android/wear/src/main/res/values/wear.xml`에 `tomato_farm_wear_app` capability를 추가한다.
   - `android/wear/src/main/java/com/lifestreak/wear/workout/WearAppRefreshListenerService.kt`를 추가해 `/tomato/app/refresh` message를 받는다.
   - listener는 수신 payload를 검증 가능한 local 상태로 기록하고, 앱이 켜져 있으면 러닝 화면을 방해하지 않는 낮은 우선순위 feedback만 남긴다.
   - 이 listener는 운동 저장 payload나 `WearExerciseService` 상태를 변경하지 않는다.

5. Web refresh hook
   - `utils/build-info.js`의 `requestTomatoAppRefresh()` 시작부에서 native Android 환경이면 `window.Capacitor?.Plugins?.TomatoWearAppUpdate?.requestRefreshOrInstall(...)`을 호출한다.
   - native call은 짧은 timeout으로 감싸 앱 reload를 무한 대기시키지 않는다.
   - web/PWA/production Pages에서는 plugin이 없으면 조용히 no-op 처리한다.
   - user feedback은 기존 `showToast()` 스타일을 유지한다. 설치 prompt를 연 경우 `갤럭시워치 설치 화면을 열었어요` 계열의 toast를 표시한다.

6. Cache/static assets
   - `utils/build-info.js`가 `STATIC_ASSETS` 대상이므로 `sw.js` `CACHE_VERSION`을 같은 변경에서 bump한다.
   - cache marker를 고정하는 기존 tests의 기대값을 함께 갱신한다.

### 하지 않을 것

1. 워치 APK를 phone에서 임의로 sideload하거나, APK 파일을 직접 다운로드/설치하지 않는다.
2. Play Store 없이 무음 설치/무음 업데이트를 구현하지 않는다.
3. 운동 저장 bridge(`/tomato/workout/run/complete`, `workout/wear-bridge.js`)의 payload schema를 바꾸지 않는다.
4. `www/`를 직접 수정하지 않는다.
5. Firebase/Firestore 저장 경로를 변경하지 않는다.
6. Galaxy Watch 전용 Samsung SDK를 추가하지 않는다. Galaxy Watch는 Wear OS API 경로로 처리한다.

## 검증 계획

1. RED
   - `tests/wear-app-refresh-update.test.js`를 추가한다.
   - 현재 코드에서 다음 조건이 없어 실패해야 한다: `TomatoWearAppUpdatePlugin`, `registerPlugin(...)`, `tomato_farm_wear_app`, `/tomato/app/refresh`, `RemoteActivityHelper`, `requestRefreshOrInstall`, `utils/build-info.js` native hook.

2. GREEN 정적/단위 검증
   - `node --check utils/build-info.js && node --check sw.js`
   - `node --test tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js tests/app-shell-action-bridge.test.js tests/wear-workout-bridge.test.js`
   - `npm.cmd run verify:assets`
   - `git diff --check`

3. Android compile 검증
   - `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug`
   - compile output에서 `TomatoWearAppUpdatePlugin`, `WearAppRefreshListenerService`, `wear.xml` capability가 포함되어야 한다.

4. Manual QA: installed watch path
   - paired Android phone/Galaxy Watch 또는 paired emulator에 phone APK와 watch APK를 설치한다.
   - phone 앱에서 헤더 `#app-refresh-btn`을 누른다.
   - 기대: phone native plugin이 connected watch를 installed node로 판정하고 `/tomato/app/refresh` message를 전송한다.
   - evidence: `.omo/evidence/wear-app-refresh-update-install/installed-node-log.txt`, 필요 시 watch logcat 캡처.

5. Manual QA: missing watch app path
   - paired watch에서 `com.lifestreak.app` watch 앱만 제거하고 phone 앱은 유지한다.
   - phone 앱에서 헤더 `#app-refresh-btn`을 누른다.
   - 기대: 해당 watch에서 Play Store listing 또는 설치 화면이 열린다. 앱이 Play Store track에 없으면 이 단계는 `not verified yet`으로 남기고 정확한 Play Store/listing blocker를 기록한다.
   - evidence: `.omo/evidence/wear-app-refresh-update-install/install-prompt-log.txt`, 가능하면 watch 화면 캡처.

6. Production/PWA 검증
   - root JS 변경이 있으므로 운영 Pages 배포가 필요한 execution이면 `npm.cmd run deploy:production` 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`를 실행한다.
   - production web/PWA에서는 native plugin이 없어도 refresh button이 기존처럼 reload되어야 한다.

## 다음 실행 지시

이 계획의 Slice 1만 실행한다. 먼저 `tests/wear-app-refresh-update.test.js`를 RED로 추가한 뒤, Android source tracking 예외, phone Capacitor plugin, watch capability/listener, `utils/build-info.js` native hook, `sw.js` cache bump를 구현한다. 운동 저장 bridge나 러닝 UI는 변경하지 않는다.

## 실행 결과

1. `tests/wear-app-refresh-update.test.js`를 추가해 phone native plugin, `MainActivity` 등록 순서, watch capability/listener, `RemoteActivityHelper`, `/tomato/app/refresh`, `utils/build-info.js` native hook, `sw.js` cache marker를 고정했다.
2. `.gitignore`에 Android source/resource 예외를 추가해 이 slice의 새 native 파일이 git status에 보이도록 했다. 앱 로컬 secret(`android/app/google-services.json`, `android/app/*.jks`, `android/app/*.keystore`, `android/app/*.p12`, `android/app/*.key`)은 다시 ignore로 보호했다.
3. `android/app/src/main/java/com/lifestreak/app/wear/TomatoWearAppUpdatePlugin.kt`를 추가했다. 이 plugin은 connected watch node를 조회하고, `tomato_farm_wear_app` capability가 있는 node에는 `/tomato/app/refresh` message를 보내며, capability가 없는 node에는 `market://details?id=com.lifestreak.app` Wear OS Play Store 화면을 `RemoteActivityHelper`로 연다. 동기 prompt 실패는 `failures` summary에 담는다.
4. `android/app/src/main/java/com/lifestreak/app/MainActivity.java`에서 `TomatoWearAppUpdatePlugin`을 `super.onCreate(...)` 전에 등록했다.
5. `android/app/build.gradle`에 `androidx.wear:wear-remote-interactions:1.2.0`을 추가했다.
6. `android/wear/src/main/res/values/wear.xml`에 `tomato_farm_wear_app` capability를 추가했다.
7. `android/wear/src/main/java/com/lifestreak/wear/workout/WearAppRefreshListenerService.kt`와 manifest service를 추가해 `/tomato/app/refresh` ping을 수신하고 local receipt를 저장한다. 수신 payload는 문자열 decode 전 2048 bytes로 제한한다.
8. `utils/build-info.js`의 `requestTomatoAppRefresh()`가 reload 전 `window.Capacitor?.Plugins?.TomatoWearAppUpdate?.requestRefreshOrInstall(...)`을 짧은 timeout으로 호출한다. web/PWA에서 plugin이 없으면 no-op이다.
9. `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260708z8-wear-app-refresh-install`로 bump했고 cache marker tests와 `build-info.json`을 동기화했다.

## 실행 검증

1. PASS RED: `node --test tests/wear-app-refresh-update.test.js`가 구현 전 `TomatoWearAppUpdatePlugin`, `wear.xml`, JS hook 부재로 실패했다. Evidence: `.omo/evidence/wear-app-refresh-update-install/red-wear-app-refresh-update.txt`.
2. PASS: `node --check utils/build-info.js && node --check sw.js`.
3. PASS: `node --test tests/wear-app-refresh-update.test.js tests/pwa-update-auto-reload.test.js tests/app-shell-action-bridge.test.js tests/wear-workout-bridge.test.js` - 15 tests, 15 pass. Evidence: `.omo/evidence/wear-app-refresh-update-install/focused-js-tests-after-ignore-scope-fix.txt`.
4. PASS: `npm.cmd run verify:assets` - `[build-info] b5d6df60190a tomatofarm-v20260708z8-wear-app-refresh-install`, `[runtime-assets] ok refs=911`. Evidence: `.omo/evidence/wear-app-refresh-update-install/verify-assets.txt`.
5. PASS: `node --test tests/*.test.js` - 754 tests, 754 pass. Evidence: `.omo/evidence/wear-app-refresh-update-install/full-node-tests-after-review-fixes.txt`.
6. PASS: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./android/gradlew.bat -p android :app:assembleDebug :wear:testDebugUnitTest :wear:assembleDebug` - BUILD SUCCESSFUL. Evidence: `.omo/evidence/wear-app-refresh-update-install/android-gradle-after-review-fixes-2.txt`.
7. PASS with existing CRLF warnings: `git diff --check` exited 0. `git check-ignore` confirms `android/app/google-services.json`, `android/app/release.jks`, `android/app/upload.keystore` are ignored, while the exact new native files are visible. Evidence: `.omo/evidence/wear-app-refresh-update-install/diff-check-after-review-fixes.txt`.
8. not verified yet: paired phone/Galaxy Watch runtime QA and missing-watch Play Store install prompt QA could not run because this session has no paired device/Play Store install surface. Evidence: `.omo/evidence/wear-app-refresh-update-install/manual-qa-blocker.txt`.
9. not verified yet probe: `node --check scripts/verify-wear-refresh-adb.mjs && npm.cmd run verify:wear-refresh -- --mode probe`는 `adb`를 찾았지만 attached device가 0개였다. Evidence: `.omo/evidence/wear-app-refresh-update-install/adb-device-probe-latest.txt`.

## Paired Device QA Helper

실제 paired phone/Galaxy Watch가 있는 세션에서는 아래 helper로 동일한 증거를 남긴다.

주의: Galaxy Wearable 앱에서 "연결됨"으로 보이는 것과 PC의 `adb devices`에 설치 대상으로 보이는 것은 다르다. local/debug APK를 워치에 설치하려면 Galaxy Watch에서 Developer options와 Wireless debugging을 켠 뒤 PC에서 `adb pair WATCH_IP:PAIRING_PORT`, `adb connect WATCH_IP:CONNECT_PORT`로 워치를 ADB 장치로 붙여야 한다.

0. Local/debug install path:
   - debug APK를 먼저 만든다: `.\android\gradlew.bat -p android :app:assembleDebug :wear:assembleDebug`
   - 워치 앱만 설치하면 되면 phone 없이 실행한다: `npm.cmd run install:wear-watch`
   - phone/watch가 ADB에 각각 하나씩 보이면 serial 없이 실행한다: `npm.cmd run install:wear-pair`
   - 자동 판별이 안 되면 serial을 직접 지정한다: `npm.cmd run install:wear-pair -- --phone PHONE_SERIAL --watch WATCH_SERIAL`
   - PASS evidence: watch-only는 `.omo/evidence/wear-app-refresh-update-install/wear-watch-install-adb-verification.txt`에 `watchPackageInstalledAfter=true`, pair는 `.omo/evidence/wear-app-refresh-update-install/wear-pair-install-adb-verification.txt`에 `phonePackageInstalledAfter=true`, `watchPackageInstalledAfter=true`가 기록된다.
1. Installed watch path:
   - `npm.cmd run verify:wear-refresh -- --mode installed --phone PHONE_SERIAL --watch WATCH_SERIAL`
   - script가 대기하는 동안 phone 앱 헤더 `#app-refresh-btn`을 누른다.
   - PASS evidence: `.omo/evidence/wear-app-refresh-update-install/installed-node-adb-verification.txt`에 fresh `last_received_at`가 기록된다.
2. Missing watch app path:
   - paired watch에서 `com.lifestreak.app` watch 앱을 제거한다.
   - `npm.cmd run verify:wear-refresh -- --mode missing --phone PHONE_SERIAL --watch WATCH_SERIAL`
   - script가 대기하는 동안 phone 앱 헤더 `#app-refresh-btn`을 누른다.
   - PASS evidence: `.omo/evidence/wear-app-refresh-update-install/missing-watch-install-prompt-adb-verification.txt`와 watch screenshot에 Wear Play Store foreground가 기록된다.

## 2026-07-09 추가 실행 결과

1. 사용자 피드백: Play Store 등록 앱이 아니고 Galaxy Watch에 토마토 앱 아이콘이 없었다.
2. 조치: `npm.cmd run install:wear-watch`를 추가해 phone 없이 ADB-visible watch에 `wear-debug.apk`를 직접 설치할 수 있게 했다.
3. PASS: `npm.cmd run install:wear-watch`가 `192.168.0.106:46473` Galaxy Watch를 자동 선택했고 `watchInstallStatus=0`, `watchPackageInstalledAfter=true`, `result=PASS`를 기록했다. Evidence: `.omo/evidence/wear-app-refresh-update-install/wear-watch-install-adb-verification.txt`.
4. PASS: `adb shell cmd package resolve-activity --brief com.lifestreak.app`가 `com.lifestreak.app/com.lifestreak.wear.MainActivity`를 반환했고, `adb shell monkey -p com.lifestreak.app -c android.intent.category.LAUNCHER 1`가 `launchExit=0`으로 실행됐다.

## 다음 세션 시작 프롬프트

`docs/ai/features/2026-07-08-wear-app-refresh-update-install.md`의 실행 Slice 1 결과를 리뷰한다. 특히 paired phone/Galaxy Watch에서 `#app-refresh-btn` 클릭 시 installed watch가 `/tomato/app/refresh`를 수신하는지, watch 앱이 없는 경우 `market://details?id=com.lifestreak.app` 설치 화면이 열리는지 실제 기기/paired emulator에서 검증한다.
