# 러닝 GPS 전체 궤적 및 중단 복구 계획

## 요청

첨부 화면처럼 러닝 결과 지도에서 GPS 전체 궤적이 아니라 시작점과 끝점만 직선으로 연결되는 문제를 해결한다. Android 또는 iPhone 환경에서 앱이 백그라운드로 가거나 WebView/PWA가 잠깐 종료되어 GPS 추적이 중단될 가능성까지 고려해, 누락된 구간을 거짓 직선으로 잇지 않는 구조로 설계한다.

## /diagnose

### 확인한 코드 근거

1. 실제 GPS 러닝 구현은 `budgetproject`가 아니라 `C:\Users\USER\Desktop\Tomato Project\tomatofarm-deploy-life-zone-nickname`에 있다.
2. `workout/running-session.js`는 `navigator.geolocation.watchPosition()`으로 위치를 받고 `_session.route`에 누적한다.
3. 저장 경로는 `workout/save.js`의 `_buildWorkoutPayload()`가 `S.workout.runData.route`를 `runRoute`로 저장한다.
4. 로드 경로는 `workout/load.js`가 `runRoute`를 다시 `S.workout.runData.route`로 복원한다.
5. 상세 지도는 `render-calendar.js`가 `renderRunningMap(shell, { points: payload.points, phase: 'detail' })`로 전체 `runRoute`를 넘긴다.
6. 지도 렌더러 `workout/running-map.js`는 현재 입력받은 `points` 배열을 하나의 route로 정규화해 Google/TMAP/VWorld polyline으로 그린다.
7. 이전 `2026-07-02-running-session-reload-recovery` 계획은 리로드 후 draft 복구를 다뤘지만, `백그라운드 GPS 지속 추적 네이티브 구현`은 제외했다.
8. 이전 `2026-07-02-home-running-map-route-clarity` 계획은 홈 말풍선 지도 표현력만 고쳤고, `GPS 수집 주기, 저장 schema, 운동 상세 지도 렌더러`는 제외했다.

### 외부 플랫폼 근거

- Web Geolocation의 `watchPosition()`은 위치가 바뀔 때 callback을 등록하는 브라우저 API이고, HTTPS/사용자 권한이 필요하다. 출처: MDN `Geolocation.watchPosition()`, https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
- Android에서 앱이 백그라운드에서도 위치 접근을 유지하려면 foreground service와 `location` foreground service type/권한 조건을 만족해야 한다. 출처: Android Developers, https://developer.android.com/develop/sensors-and-location/location/permissions 및 https://developer.android.com/develop/background-work/services/fgs/service-types
- iOS에서 백그라운드 위치 업데이트는 Core Location의 background location 설정이 필요한 네이티브 앱 영역이다. 출처: Apple Developer, https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background

### 반증 가능한 가설

1. 시작 직후 route가 비어 있다가 첫 `watchPosition` 이동 이벤트부터 누적되어, 짧은 러닝이나 앱 전환이 있으면 1-2개 점만 저장된다.
   - 구분 증거: `_startRun()`이 preview/current point를 route 첫 점으로 강제 삽입하지 않는다.
   - 고칠 방향: 시작점 강제 seed.
2. pause/resume, `visibilitychange`, `pagehide`, WebView/PWA 재시작 이후 첫 새 점이 이전 마지막 점과 같은 segment로 이어져, 실제로 GPS가 멈춘 구간을 직선 거리와 polyline으로 계산한다.
   - 구분 증거: route point에 `gapBefore` 또는 `segmentId`가 없고 `runningRouteDistanceMeters()`가 모든 인접 점 사이를 합산한다.
   - 고칠 방향: segment/gap-aware route.
3. `downsampleRunningRoute()`가 전체 route를 균등 샘플링해 segment 경계, 시작/종료 주변 점, gap 첫 점을 보존한다는 계약이 없다.
   - 구분 증거: 현재 downsample은 배열 전체를 `Math.round(i * step)`으로 뽑는다.
   - 고칠 방향: segment-aware downsample.
4. 저장/상세 렌더러는 배열을 보존하지만 지도 렌더러가 항상 단일 polyline을 그려, 끊긴 구간을 표현할 방법이 없다.
   - 구분 증거: VWorld `_vworldRouteSvg()`와 Google/TMAP 렌더가 route 하나만 받는다.
   - 고칠 방향: polyline split render.
5. Android/iPhone 백그라운드 지속 추적은 현재 PWA/WebView JS만으로 보장할 수 없다.
   - 구분 증거: repo에는 Capacitor Android dependency는 있지만 Android native location service/plugin 구현과 iOS project가 없다.
   - 고칠 방향: 즉시 웹 복구 + 별도 네이티브 추적 슬라이스.

## 그릴 결과

- 핵심 질문: 누락된 GPS 구간을 어떻게 보여줄 것인가?
- 결정: 누락된 구간은 임의 직선으로 연결하지 않는다. 샘플이 없는 구간은 `gapBefore`/segment 경계로 저장하고, 지도에서는 선을 끊고, 거리 계산에서도 해당 edge를 제외한다.
- 핵심 질문: Android/iPhone 백그라운드 추적을 이번 수정에 어디까지 포함할 것인가?
- 결정: Slice 1은 현재 배포 가능한 PWA/웹 코드에서 route integrity를 고친다. Android foreground service와 iOS Core Location은 별도 네이티브 slice로 설계하되, 현재 repo의 Dashboard3 Pages 배포 흐름에 섞지 않는다.
- 남은 가정: 실제 기기에서 OS가 제공하지 않은 중간 GPS 점은 웹 코드가 복원할 수 없다. 이 경우 올바른 동작은 “전체 궤적을 꾸며내기”가 아니라 “구간 중단을 기록하고 선을 끊기”다.

## 결정

1. `runRoute`는 flat array를 유지하되 각 point에 선택 필드 `segmentId`, `gapBefore`, `gapReason`을 추가할 수 있게 한다.
2. 시작 시 preview/current point를 route 첫 점으로 강제 seed한다. 시작점은 최소 거리 필터를 우회한다.
3. 앱이 hidden/pagehide 상태가 되었거나 수동 pause/resume이 발생했거나 마지막 point 이후 일정 시간 이상 위치 업데이트가 끊긴 경우, 다음 point에 `gapBefore: true`를 붙인다.
4. 거리 계산은 `gapBefore` 또는 segment 변경 edge를 합산하지 않는다.
5. 지도 렌더는 segment별 polyline을 그린다. gap 구간은 선이 끊긴 상태로 표시하고, 필요하면 작은 중단 marker만 둔다.
6. downsample은 segment 경계, 첫 점, 마지막 점, gap 첫 점을 보존한다.
7. summary에는 `segmentCount`, `gapCount`, `interrupted`를 저장한다. UI는 중단 구간이 있으면 “GPS 중단 구간 n개”를 작은 상태 문구로 표시한다.
8. Android 네이티브 지속 추적은 foreground service와 native point queue를 사용하는 별도 slice로 둔다. native는 Firestore에 직접 쓰지 않고 JS bridge가 기존 `data.js`/workout save 경로로 흘려보낸다.
9. iPhone 백그라운드 지속 추적은 현재 iOS project가 없으므로 Slice 1에서 구현하지 않는다. 필요한 경우 별도 Capacitor iOS/Core Location 프로젝트 생성과 Apple signing/device 검증 계획을 먼저 세운다.

## Slice 1. 웹/PWA 러닝 route integrity 수정

### 변경 파일

- `workout/running-session.js`
- `workout/running-map.js`
- `render-calendar.js`
- `style.css`
- `tests/running-tracker.test.js`
- `tests/running-entry.test.js`
- `tests/workout-calendar-bottom-sheet.test.js`
- `sw.js`
- `docs/ai/NEXT_ACTION.md`

### 포함 범위

1. `workout/running-session.js`
   - `ROUTE_GAP_MS`와 route segment/gap helper를 추가한다.
   - `_startRun()`이 preview point 또는 즉시 `getCurrentPosition()` 결과를 첫 route point로 seed하게 한다.
   - `_pushPosition()`에 `{ force, gapBefore, gapReason }` 옵션을 추가하고 첫 점/gap 첫 점은 `MIN_ROUTE_STEP_M` 필터를 우회한다.
   - `_pauseRun()`, `_resumeRun()`, `visibilitychange(hidden)`, `pagehide`, draft restore 이후 재개에서 다음 point가 이전 point와 직선 연결되지 않도록 gap pending 상태를 저장한다.
   - `normalizeRunningSessionDraft()`와 `_buildRunningDraft()`가 segment/gap metadata를 보존한다.
   - `summarizeRunningRoute()`와 `runningRouteDistanceMeters()`가 gap edge를 거리 계산에서 제외하고 `segmentCount`, `gapCount`, `interrupted`를 반환한다.
2. `workout/running-map.js`
   - `normalizeRunningMapPoints()`가 `segmentId`, `gapBefore`, `gapReason`을 보존한다.
   - route를 segment별로 split하는 helper를 추가한다.
   - Google/TMAP/VWorld renderer가 여러 polyline을 그리며 gap edge를 연결하지 않는다.
3. `render-calendar.js`
   - 상세 카드/summary에서 `runRouteSummary.gapCount > 0`이면 “GPS 중단 구간 n개” 상태를 작게 표시한다.
   - 상세 지도 payload가 gap metadata를 그대로 넘기도록 한다.
4. `style.css`
   - 상세 카드의 GPS 중단 상태 문구와 VWorld/지도 segment line 스타일을 추가한다.
5. `tests/`
   - 시작점 seed, pause/resume gap, hidden/pagehide gap, gap edge 거리 제외, segment별 polyline 렌더 marker, draft metadata 보존을 회귀 테스트한다.
6. `sw.js`
   - `STATIC_ASSETS`에 포함된 파일 변경에 맞춰 `CACHE_VERSION`을 bump한다.

### 제외 범위

1. Android foreground service 구현.
2. iOS native Core Location 구현.
3. VWorld/Google/TMAP provider 교체.
4. Firestore schema를 별도 컬렉션으로 분리.
5. 누락된 GPS 샘플을 추정 경로로 보간하는 기능.
6. 러닝 summary 화면 전체 redesign.

### 검증 계획

1. `node --check workout/running-session.js workout/running-map.js render-calendar.js sw.js`
2. `node --test tests/running-tracker.test.js tests/running-entry.test.js tests/workout-calendar-bottom-sheet.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test --test-reporter=dot tests/*.test.js`
5. `git diff --check`
6. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
7. 운영 asset marker 확인: 새 `CACHE_VERSION`, `gapBefore`, `segmentId`, route split helper, `GPS 중단 구간`.
8. 운영 UI flow: 인증 계정에서 `운동 -> 런닝/조깅 -> 시작 -> 이동/일시정지/재개 또는 브라우저 background -> 종료 -> 저장 -> 상세 카드`로 진입해 지도 선이 중단 구간을 직선으로 잇지 않고 저장된 route point count/gap count가 표시되는지 확인한다.

## Slice 2. Android 네이티브 백그라운드 추적 설계 및 구현

### 포함 범위

1. Android native location foreground service 추가.
2. `AndroidManifest.xml`에 `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, Android 10+ background location 검토, Android 13+ notification permission, Android 14+ `FOREGROUND_SERVICE_LOCATION` 및 service type `location` 반영.
3. 지속 notification에 “러닝 기록 중” 상태를 표시한다.
4. native service가 point queue를 local storage에 저장해 WebView가 죽어도 route를 잃지 않게 한다.
5. JS bridge 또는 Capacitor plugin으로 `startRunningTracking`, `pauseRunningTracking`, `resumeRunningTracking`, `stopRunningTracking`, `drainRunningTrack` 계약을 만든다.
6. JS는 native queue를 받아 기존 `runRoute`/`runRouteSummary` 저장 경로로만 흘려보낸다.

### 제외 범위

1. native가 Firebase/Firestore에 직접 저장하는 구조.
2. secret, token, API key를 native에 새로 저장하는 구조.
3. iOS 구현.

### 선행 조건

- Android build/signing 환경 확인.
- 실제 Android 기기 또는 emulator location playback fixture.
- foreground service notification UX와 권한 문구 승인.

## Slice 3. iPhone/iOS 백그라운드 추적 의사결정

현재 repo에는 iOS project가 없다. iPhone에서 “앱이 꺼지거나 백그라운드인 동안 계속 GPS를 수집”하려면 PWA만으로는 보장하지 않고, Capacitor iOS project와 Core Location background mode가 필요하다.

### 선택지

1. iPhone은 Slice 1의 중단 감지/복구까지만 지원한다.
2. 별도 계획으로 Capacitor iOS target을 생성하고 Core Location background tracking을 구현한다.

추천 기본값은 1번이다. 이유는 현재 repo의 배포 기본값이 Dashboard3 Pages이고, iOS native target/signing/device QA가 아직 준비되어 있지 않기 때문이다.

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-07-09-running-gps-full-route-resilience.md`의 Slice 1만 실행한다. `workout/running-session.js`와 `workout/running-map.js`를 중심으로 시작점 seed, gap-aware route metadata, gap edge 거리 제외, segment별 polyline 렌더링을 구현하고, `render-calendar.js`, `style.css`, 관련 테스트, `sw.js` cache version을 함께 갱신한다. Android/iOS native background tracking은 이번 실행에서 구현하지 않는다.
