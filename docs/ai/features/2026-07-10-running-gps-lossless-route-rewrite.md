# 러닝 GPS 무손실 궤적 재작성 계획

## 요청

- 구현 대상은 `budgetproject`가 아니라 Tomato Farm Lite다.
- 모바일과 갤럭시워치 모두 실제 러닝 좌표의 전체 순서와 곡선 형태를 보존해야 한다.
- 시작점/끝점 또는 성긴 직선 조각만 저장하거나 그려서는 안 된다.
- 거리와 시간은 0이 아니어야 하며, GPS가 끊긴 구간은 거짓 직선으로 연결하지 않는다.
- `budgetproject`에 잘못 배포한 GPS 기능은 별도 revert로 제거한다.

## /diagnose 결과

### 재현된 설계 결함

1. `workout/running-session.js`는 `MAX_ROUTE_POINTS = 240`이며 저장 전 route를 균등 축소한다.
2. 모바일 수집은 3m 미만 이동 샘플을 버리고, route가 480점을 넘으면 실행 중에도 240점으로 다시 축소한다.
3. `WearExerciseService`는 한 Health Services update에 포함된 `LOCATION` 목록에서 `lastOrNull()` 하나만 취한다.
4. `WearExerciseMetricAccumulator`는 GPS도 심박수와 같은 10초 bucket key에 넣어 같은 bucket의 중간 좌표를 덮어쓴다.
5. Wear payload, phone bridge, JS bridge는 각각 2,161점에서 route를 자르거나 거부한다.
6. Wear `MessageClient`는 큰 route 전달용이 아니다. 공식 문서는 message payload를 일반적으로 100KB 이하로 제한하고, 큰/영속 데이터는 `DataClient` Asset 또는 Channel을 사용하라고 안내한다.
7. 최종 `runRoute`는 하루 workout 문서 안에 inline array로 저장되어 Firestore 1MiB 문서 한계 때문에 전체 route를 안전하게 보존할 수 없다.
8. 지도 renderer는 받은 순서대로 segment별 polyline을 그린다. 따라서 현재 각진 궤적의 주원인은 지도 보간이 아니라 upstream 좌표 유실이다.

### 반증 가능한 가설

1. 600개 이상의 곡선 fixture를 넣었을 때 모바일 save payload가 240점이면 웹 축소가 원인이다.
2. 한 Wear update에 여러 LOCATION을 넣었을 때 마지막 점만 남으면 `lastOrNull()`이 원인이다.
3. 10초 안에 여러 Wear 좌표를 넣었을 때 하나만 남으면 route bucket overwrite가 원인이다.
4. 100KB를 넘는 payload를 `MessageClient`로 보내면 공식 API 권장 경계를 위반한다.
5. 전체 route를 day document에 inline 저장하면 장거리/사진 포함 문서에서 Firestore 크기 한계를 넘을 수 있다.

## 그릴 결과

- 핵심 질문: 전체 좌표를 어디에 저장할 것인가?
- 결정: day/session 문서에는 작은 preview와 `runRouteRef`만 저장하고, 원본 route는 `users/{ownerId}/running_routes/{routeId}/chunks/{index}`에 순서·revision·pointCount 계약으로 저장한다.
- 핵심 질문: 워치의 100KB 초과 route를 어떻게 폰으로 보낼 것인가?
- 결정: `MessageClient`를 제거하고 `DataClient` + `Asset` urgent data item을 사용한다. 폰은 Asset bytes를 app-private file에 먼저 저장한 뒤 WebView bridge가 성공할 때까지 재시도한다.
- 핵심 질문: 지도 성능을 위해 다시 축소할 것인가?
- 결정: 저장 route는 축소하지 않는다. 목록/day 문서에는 preview만 두고, 사용자가 `경로 보기`를 누를 때 원본 chunks를 hydrate하여 실제 지도에 전달한다.
- 핵심 질문: 최대치에서 조용히 잘라도 되는가?
- 결정: 안 된다. 25,000점을 명시적 상한으로 두고 초과 route는 저장/전송 단계에서 오류로 표시한다. 6시간 1Hz 기록을 포함하면서 silent truncation은 금지한다.

## 실행 Slice 1. 모바일/워치 무손실 route pipeline

### 변경 파일

- `workout/running-session.js`
- `workout/save.js`, `workout/load.js`, `workout/sessions.js`, `workout/save-schema.js`
- `data.js`, `data/data-core.js`, 신규 `data/data-running-route.js`
- `render-calendar.js`
- `android/wear/.../WearExerciseService.kt`
- `android/wear/.../WearExerciseMetricAccumulator.kt`
- `android/wear/.../WearRunPayload.kt`
- `android/wear/.../WearWorkoutDataLayer.kt`
- `android/app/.../TomatoWearWorkoutListenerService.kt`
- `android/app/.../TomatoWearWorkoutBridge.kt`
- `android/app/src/main/AndroidManifest.xml`
- 관련 JS/Kotlin tests
- `sw.js`, `build-info.json`, cache marker tests

### 구현 계약

1. 모바일 `watchPosition`의 유효 좌표를 입력 순서대로 모두 보존한다. 240점 축소와 3m 고정 간격 필터를 저장 경로에서 제거한다.
2. live preview는 별도 preview helper만 사용할 수 있으며 원본 route 배열을 변경하지 않는다.
3. Wear service는 update 안의 모든 LOCATION delta를 timestamp 순서로 accumulator에 전달한다.
4. Wear accumulator는 좌표 전체 fingerprint가 완전히 같은 샘플만 중복 제거하고 10초 bucket을 GPS에 사용하지 않는다. timestamp가 같아도 좌표가 다르면 입력 순서대로 모두 보존한다.
5. Wear payload는 25,000점 초과를 명시적으로 실패시키며 `take()`로 조용히 자르지 않는다.
6. Wear 전송은 `DataClient` Asset을 사용한다. phone listener는 byte length와 SHA-256을 검증하고 `fsync`한 app-private file을 큐에 등록한 뒤에만 DataItem을 삭제한다.
7. phone retry queue는 route bytes를 SharedPreferences JSON에 중복 저장하지 않고 file metadata만 보존한다. 큐 포화 시 기존 항목을 버리지 않으며, WebView 저장 Promise가 성공한 뒤에만 ACK/tombstone으로 파일을 제거한다.
8. `saveRunningRoute()`는 SHA-256 content-addressed immutable route ID, 250점 및 encoded 900,000-byte 이하 chunk, ordered index, revision, complete flag를 사용하고 parent/chunks를 한 batch로 commit한다. `loadRunningRoute()`는 revision/count/hash가 모두 맞는 경우에만 전체 route를 반환한다.
9. day/session 저장은 `runRouteRef`, full `pointCount`, preview route를 유지한다. 상세 `경로 보기`는 ref가 있으면 전체 route를 먼저 hydrate한다.
10. gap metadata와 gap edge 거리 제외는 기존 계약을 유지한다.
11. 모바일 Geolocation은 실시간으로 계속 수집한다. 30초는 전체 route draft를 `localStorage`에 쓰는 최소 주기일 뿐이며, `pagehide`/visibility 전환/종료 시에는 즉시 저장한다.

### 제외

- 누락된 좌표 보간.
- iOS native Core Location target 신규 생성.
- 지도 provider 교체.
- 실제 사용자 기존 route 삭제 또는 강제 마이그레이션.

## RED/GREEN 검증

1. dense mobile fixture 620점이 저장 직전 620점으로 유지되고 모든 index/좌표가 일치한다.
2. Wear 한 update의 6개 LOCATION과 같은 10초 구간의 여러 점이 모두 유지된다.
3. 25,001점은 silent truncation이 아니라 명시적 실패다.
4. route chunk round-trip은 620점/3 chunks, 25,000점/100 chunks, stale revision, missing chunk, hash/count mismatch와 원자적 commit 실패를 검증한다.
5. Wear Asset sender/listener와 phone file queue 계약을 Kotlin unit test로 검증한다.
6. `경로 보기` click 전 map 미로드, click 후 full pointCount로 renderer 호출을 브라우저에서 검증한다.
7. focused JS/Kotlin, 전체 JS, Android app/wear tests, `verify:assets`, `git diff --check`를 통과한다.
8. `origin/main` 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`과 production UI를 확인한다.
9. 실제 Galaxy Watch/phone 센서 round-trip은 연결 기기가 없으면 `not verified yet`으로 정확히 남긴다.

## 별도 운영 정리

- `budgetproject` commit `1a43f87`의 GPS 기능은 그 저장소의 최신 `origin/main` 기준 clean worktree에서 `git revert`해 별도 배포한다.
- `budgetproject`의 다른 설정/디자인 변경과 Tomato Farm Lite의 기존 dirty worktree는 포함하지 않는다.

## 로컬 구현 결과

- 모바일 `watchPosition` 620개 fixture는 source/draft/save가 모두 620개이고 day/session preview만 240개다.
- Wear native는 update의 전체 LOCATION을 수집하고 Asset/file queue/ACK 경계로 전달한다.
- 웹 Wear 변환은 2,162개를 그대로 저장하며 25,001개와 malformed/decreasing route를 명시적으로 거부한다.
- Firestore route는 immutable ref와 250점 chunk로 분리되고 day/session에는 preview와 full `pointCount`만 inline 저장된다.
- 러닝 상세는 `경로 보기` 클릭 전 map을 로드하지 않고 클릭 후 전체 route를 single-flight로 hydrate한다. 실패 재시도와 stale response 무시를 포함한다.
- 로컬 검증: JS `824/824`, 375px Puppeteer hydration UI, Android app/wear unit tests 및 debug APK assemble, `verify:assets refs=923` 통과.
- 실기기 Galaxy Watch/phone round-trip은 연결된 물리 기기가 없어 아직 검증하지 못했다.

## 다음 자동 액션

GPT-5.6 코드/보안/UX 리뷰를 통과시킨 뒤 Tomato Farm production 배포를 검증하고, 별도 clean worktree에서 `budgetproject` 오구현 commit을 revert한다.
