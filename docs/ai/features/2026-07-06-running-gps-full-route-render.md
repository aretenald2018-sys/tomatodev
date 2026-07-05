# 2026-07-06 Running GPS Full Route Render

## 요청

러닝 GPS 지도가 시작점과 끝점만 직선으로 연결하지 않고, 폰이 수집한 전체 이동경로를 순서대로 렌더링해야 한다.

## 진단 요약

1. `workout/running-map.js`의 공유 지도 normalizer는 현재 `lat/lng`만 허용한다.
2. `home/life-zone-state.js`는 이미 폰/외부 경로 형태인 `latitude/longitude/lon`을 정상화한다.
3. 러닝 저장 경로는 `S.workout.runData.route` -> `runRoute` -> `render-calendar.js` `row.route` -> `renderRunningMap()`으로 이어진다.
4. 따라서 폰 이동경로 샘플이 `latitude/longitude` 형태로 섞이면 중간 지점이 지도 렌더링 전에 누락될 수 있다.
5. `workout/running-map.js`는 `sw.js` `STATIC_ASSETS`에 포함되어 있으므로 수정 시 `CACHE_VERSION`을 함께 올린다.

## 가설

1. 공유 지도 normalizer가 `latitude/longitude/lon` 샘플을 버려 실제 폰 경로가 시작/끝점 위주로 보인다.
2. 저장 상세 화면은 `runRoute` 자체를 전달하고 있으므로, 렌더러 입력 정상화만 맞추면 중간 샘플이 복구된다.
3. 만약 실제 `_session.route` 자체가 두 점뿐이면 Android foreground location bridge가 별도 후속 과제지만, 이번 요청의 렌더링 결함은 먼저 `renderRunningMap()` 입력 경계에서 고정한다.

## 실행 슬라이스

### Slice 1: 공유 러닝 지도 route point normalization 보정

- 범위:
  - `workout/running-map.js`
  - `tests/running-tracker.test.js`
  - 브라우저 QA harness/evidence
  - `sw.js` cache bump
- 구현:
  1. `normalizeRunningMapPoints()`가 `lat/lng`, `latitude/longitude`, `lon`, `timestamp/time`, `accuracy`, `altitude`, `speed`를 안정적으로 정규화하게 한다.
  2. 유효하지 않은 좌표는 버리되, 유효 샘플 순서는 유지한다.
  3. VWorld/Google/TMAP 렌더러에는 기존처럼 `{ lat, lng }` 배열을 전달한다.
- 제외:
  - Android native foreground location bridge 구현
  - GPS 수집 주기/권한 정책 변경
  - 러닝 UI 디자인 변경

## 검증 계획

1. RED: `node --test tests/running-tracker.test.js`가 mixed phone route sample 정규화 기대값으로 실패해야 한다.
2. GREEN: 같은 명령이 통과해야 한다.
3. 정적/회귀:
   - `node --check workout/running-map.js`
   - `node --check tests/running-tracker.test.js`
   - `npm.cmd run verify:assets`
   - `node --test tests/*.test.js`
4. 브라우저 표면:
   - Puppeteer Chromium harness로 `renderRunningMap()`을 VWorld config와 mixed phone route 샘플에 대해 실행한다.
   - `.wt-vworld-route-line` `points`가 유효 샘플 전체 개수보다 작지 않고, `data-map-point-count`가 전체 유효 route 길이와 같아야 한다.
   - evidence: `.omo/evidence/gps-full-route-20260706/route-map-browser-qa.json`, `.omo/evidence/gps-full-route-20260706/route-map-browser-qa.png`.
5. 운영 검증:
   - 배포 커밋 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/tomatofarm/ <commit>`.

## 다음 상태

- 상태: `local_verified`
- 실행 요약:
  1. `workout/running-map.js`의 route point normalizer가 `lat/lng`, `latitude/longitude`, `latitude/lon` 샘플을 모두 같은 경로 배열로 정규화한다.
  2. `timestamp/time`을 `ts`로 통합하고 `accuracy`, `altitude`, `speed` metadata를 보존한다.
  3. `null`, `undefined`, 빈 문자열, `Infinity` 좌표는 유효하지 않은 샘플로 버린다.
  4. 지도 provider 호출 전에는 `{ lat, lng }` 좌표 전용 route로 복사해 부가 GPS telemetry가 외부 SDK 경계로 나가지 않게 한다.
  5. `workout/running-map.js`가 `STATIC_ASSETS`에 포함되어 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260706z1-running-gps-full-route`로 올렸다.
- 검증:
  1. PASS: RED/GREEN focused route normalization - `.omo/evidence/gps-full-route-20260706/red-green-tests.txt`.
  2. PASS: Puppeteer VWorld DOM QA - `data-map-point-count=4`, `.wt-vworld-route-line` point count `4`.
  3. PASS: Google provider boundary QA - polyline path, marker, bounds inputs are `lat/lng` only.
  4. PASS: `npm.cmd run verify:assets` - `[runtime-assets] ok refs=880`.
  5. PASS: `node --test tests/*.test.js`.
  6. PENDING: commit/push 후 production Pages `verify:deploy`.
- 다음 실행 슬라이스: 리뷰와 production deploy verification만 남았다.
