# 워치 러닝 GPS gap 보존 계획

## 요청

갤럭시워치로 저장한 러닝이 러닝 탭에만 쌓이더라도, GPS가 잠깐 끊긴 뒤 저장될 때 시작점과 끝점을 거짓 직선으로 잇지 않게 한다. Android/iPhone 환경에서 앱이 백그라운드로 가거나 잠깐 종료되는 상황도 고려해, 실제 샘플이 없는 구간은 전체 궤적처럼 꾸며내지 않고 중단 구간으로 남긴다.

## 현재 반영 상태

1. `2026-07-09-running-gps-full-route-resilience.md`의 웹/PWA Slice 1은 반영됐다.
   - `workout/running-session.js`는 `segmentId`, `gapBefore`, `gapReason`을 보존한다.
   - `workout/running-map.js`는 segment별 polyline을 그린다.
   - `render-calendar.js`는 `runRouteSummary.gapCount`를 표시할 수 있다.
2. 워치 저장 경로는 아직 같은 수준으로 반영되지 않았다.
   - `workout/wear-bridge.js`의 route 정규화가 `segmentId`, `gapBefore`, `gapReason`을 버린다.
   - 워치 route summary에는 `segmentCount`, `gapCount`, `interrupted`가 없다.
   - `android/wear/.../WearRunPayload.kt`의 `WearRoutePoint`와 `WearRouteSummary`도 explicit gap metadata를 실어 보낼 수 없다.
3. 따라서 워치 GPS가 끊긴 뒤 재개되면 폰 상세 지도에서 전체 궤적이 아니라 “마지막 점과 다음 점을 한 선으로 잇는” 회귀가 다시 생길 수 있다.

## 결정

1. 이번 Slice는 워치 러닝 저장 payload의 route integrity만 닫는다.
2. 워치 또는 폰 bridge가 explicit gap metadata를 받으면 그대로 보존한다.
3. explicit metadata가 없어도 route point timestamp 간격이 길면 다음 point에 `gapBefore: true`, `gapReason: "time-gap"`을 추론한다.
4. summary에는 `segmentCount`, `gapCount`, `interrupted`를 저장해 기존 러닝 카드/지도 UI가 같은 기준으로 동작하게 한다.
5. gap edge는 지도 polyline으로 이어지면 안 된다. 이미 구현된 `renderRunningMap` segment split 경로를 재사용한다.
6. native Android/Wear payload schema는 gap metadata를 담을 수 있게 확장한다. 단, 실제 OS background location foreground service와 iOS Core Location 구현은 별도 slice로 남긴다.
7. iPhone은 현재 repo에 iOS target이 없으므로 이번 Slice에서 구현하지 않는다. iPhone 백그라운드 지속 GPS는 Capacitor iOS project, signing, device QA가 필요한 별도 계획이다.

## Slice 1. 워치 러닝 route gap metadata 저장

### 변경 파일

- `workout/wear-bridge.js`
- `tests/wear-workout-bridge.test.js`
- `android/wear/src/main/java/com/lifestreak/wear/workout/WearRunPayload.kt`
- `android/wear/src/test/java/com/lifestreak/wear/workout/WearRunPayloadTest.kt`
- `tests/wear-gps-running-contract.test.js`
- `sw.js`
- cache marker가 있는 테스트 파일
- `docs/ai/NEXT_ACTION.md`

### 구현

1. `workout/wear-bridge.js`
   - route point 정규화가 `segmentId`, `gapBefore`, `gapReason`을 보존한다.
   - timestamp gap을 기준으로 missing interval을 추론한다.
   - route summary에 `segmentCount`, `gapCount`, `interrupted`를 계산한다.
   - `runData.routeSummary`와 redacted persistent queue summary에도 gap summary를 남긴다.
2. `WearRunPayload.kt`
   - `WearRoutePoint`에 optional `segmentId`, `gapBefore`, `gapReason`을 추가한다.
   - `WearRouteSummary`에 `segmentCount`, `gapCount`, `interrupted`를 추가한다.
   - JSON payload에 위 필드를 포함한다.
3. 테스트
   - RED: 워치 payload의 explicit gap metadata가 bridge에서 사라지는 실패를 먼저 고정한다.
   - RED: metadata가 없는 큰 timestamp gap이 `gapBefore`로 추론되지 않는 실패를 고정한다.
   - Kotlin payload JSON이 gap fields를 포함하는지 검증한다.
   - map split은 기존 `running-map` 계약을 재사용하되, wear bridge output이 그 계약을 만족하는지 확인한다.
4. `sw.js`
   - `workout/wear-bridge.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

### 제외

1. Android phone foreground service 기반 백그라운드 GPS 지속 수집.
2. iOS Core Location background mode 구현.
3. 누락된 GPS 샘플 보간.
4. Firestore 직접 저장 경로 추가.
5. 워치 live route page 디자인 변경.

## 검증 계획

1. RED: `node --test tests/wear-workout-bridge.test.js`
2. PASS: `node --check workout/wear-bridge.js sw.js`
3. PASS: `node --test tests/wear-workout-bridge.test.js tests/wear-gps-running-contract.test.js tests/workout-calendar-bottom-sheet.test.js`
4. PASS Android/Wear: `export JAVA_HOME='/c/Program Files/Android/Android Studio/jbr'; ./android/gradlew.bat -p android :wear:testDebugUnitTest`
5. PASS assets: `npm.cmd run verify:assets`
6. 가능하면 full JS: `node --test tests/*.test.js`
7. production 가능 시: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`

## 완료 기준

1. 워치에서 온 route point가 `segmentId/gapBefore/gapReason`을 잃지 않는다.
2. metadata가 없는 워치 route도 큰 시간 공백 뒤에는 새 segment로 저장된다.
3. `runRouteSummary.gapCount > 0`이면 러닝 상세 카드에서 중단 구간이 표시된다.
4. 상세 지도는 gap 구간을 하나의 선으로 잇지 않는다.
5. background/native 지속 추적 미구현 범위는 명시적으로 남겨, “구현됨”과 “아직 별도 native slice”를 혼동하지 않는다.
