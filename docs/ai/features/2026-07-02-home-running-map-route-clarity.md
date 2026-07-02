# 홈 러닝 지도 말풍선 경로 가시성 개선 계획

## 상태

- 요청: 홈 라이프존 말풍선 안에 지도를 유지하되, 사진 2처럼 주변 지형을 읽을 수 있는 배율과 사진 3처럼 명확한 주행 경로 선을 표시한다.
- 적용 트리거: `/diagnose` 우선, UX 표현 개선은 `/grill-me` 관점으로 보강한다.
- 범위: `home/life-zone.js`, `style.css`, 홈 러닝 지도 회귀 테스트, `sw.js` cache version.

## /diagnose

### 확인된 문제

1. 홈 지도 말풍선은 실제 route/tile 계산을 하지만 내부 캔버스가 `172x121`이고 CSS 표시 폭이 최대 `76px`라 경로가 거의 읽히지 않는다.
2. 홈 전용 zoom이 `RUNNING_MAP_HOME_MAX_ZOOM = 12`로 제한되어 있어, 실제 러닝 중인 동네/공원 맥락보다 넓은 지도 조각처럼 보일 수 있다.
3. route polyline이 단일 얇은 색선이라 타일 위에서 대비가 낮고, 현재 위치 dot만 눈에 띄면 사용자는 "점 하나만 보인다"고 느낀다.
4. GPS 라이브 흐름은 이미 `_pushPosition()` -> `_publishRunningLiveState()` -> `life-zone:running-live` -> `renderHome()` -> `_withRunningLiveDay()` -> `_buildRunningMapBubbleData()`로 이어진다. 따라서 이번 슬라이스는 수집 흐름보다 홈 말풍선의 fit/표현력을 고친다.

## Slice 1. 홈 말풍선 지도 fit 및 route overlay 개선

### 포함 범위

1. `home/life-zone.js`
   - 홈 지도 내부 크기를 키우고, route bounds를 픽셀 기준 padding 안에 맞추는 zoom 계산으로 교체한다.
   - route가 2점 이상이면 흰색 casing + 빨간 주행선 + 시작점/현재점이 함께 보이게 SVG overlay를 만든다.
   - 1점/preview 상태는 주변 지형이 보이도록 단일 위치 zoom을 낮춰 기다림 상태와 구분한다.
2. `style.css`
   - `.lz-running-map-bubble`의 실제 표시 폭을 확대한다.
   - route casing/main/start/current marker 스타일을 추가해 지도 타일 위에서 경로가 명확히 보이게 한다.
3. `tests/home-life-zone-npc-quest.test.js`
   - 새 zoom fit 계약, route casing, 확대된 말풍선 CSS, cache marker를 검증한다.
4. `sw.js`
   - `home/life-zone.js`, `style.css` 변경에 맞춰 `CACHE_VERSION`을 bump한다.

### 제외 범위

1. VWorld provider를 Naver/Google로 교체하지 않는다.
2. GPS 수집 주기, 저장 schema, 운동 상세 지도 렌더러는 바꾸지 않는다.
3. 홈 전체 리렌더를 부분 업데이트로 바꾸는 성능 리팩터는 별도 슬라이스로 남긴다.

## 검증 계획

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test --test-reporter=dot tests/*.test.js`
5. `git diff --check`
6. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-07-02-home-running-map-route-clarity.md`의 Slice 1을 실행한다. 홈 라이프존 러닝 지도 말풍선이 실제 경로와 현재 위치를 읽을 수 있도록 지도 크기, route bounds 기반 zoom fit, 흰색 casing + 빨간 주행선 overlay를 추가하고, 테스트와 `sw.js` cache version을 갱신한다.

## Slice 1 실행 결과

1. `home/life-zone.js`
   - 홈 말풍선 지도 내부 viewBox를 `300x210`으로 키웠다.
   - `_zoomForRunningMap()`을 route bounds가 말풍선 내부 padding 안에 들어오도록 픽셀 span 기준으로 zoom을 고르는 방식으로 바꿨다.
   - 1점/preview 상태는 `RUNNING_MAP_SINGLE_POINT_ZOOM = 15`로 주변 지도 맥락을 유지한다.
   - route가 2점 이상이면 흰색 casing polyline, 빨간 main polyline, 시작점 marker, 현재 위치 dot을 렌더한다.
2. `style.css`
   - `.lz-running-map-bubble` 표시 폭을 `clamp(92px, calc(300 / 1672 * 100%), 136px)`로 키웠다.
   - `.lz-running-map-path--casing`, `.lz-running-map-path--main`, `.lz-running-map-start`, 더 선명한 current dot 스타일을 추가했다.
3. `tests/`
   - 홈 라이프존 러닝 지도 테스트가 새 크기, fit zoom, route casing/main/start marker 계약을 확인하도록 갱신했다.
   - `sw.js` cache marker 테스트들을 새 버전으로 맞췄다.
4. `sw.js`
   - `CACHE_VERSION`을 `tomatofarm-v20260702z5-home-running-map-route`로 bump했다.

## Slice 1 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js` - 23 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`
6. PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ ef2b8327e044ff8b50550ae47fd3342d046d015c` -> `[deploy-verify] ok ef2b8327e044 tomatofarm-v20260702z5-home-running-map-route static=236`
7. PASS: Dashboard3 Pages marker 검증 - `sw.js` cache version, `home/life-zone.js` `RUNNING_MAP_WIDTH = 300`/`RUNNING_MAP_HOME_MAX_ZOOM = 17`/`lz-running-map-path--main`/`lz-running-map-start`, `style.css` 확대 폭/route casing/main 색상 확인
8. not verified yet: 인증 계정 홈탭 실제 러닝 말풍선 UI flow 확인은 아직 남아 있다.

## Slice 2. 홈 말풍선 축소 및 공원 단위 지도 배율 보정

### 요청

- 홈 말풍선 크기를 현재 대비 50% 줄인다.
- 말풍선 내부 지도 배율은 더 넓게 잡아, 짧은 러닝 route라도 올림픽공원 맥락이 드러나게 한다.

### 포함 범위

1. `home/life-zone.js`
   - 홈 지도 최대 zoom을 공원 단위 맥락이 보이는 값으로 낮춘다.
   - 타일 이미지를 SVG viewBox 내부의 `<image>`로 렌더해, 말풍선 CSS 크기를 줄여도 타일/경로/dot이 같은 좌표계로 함께 축소되게 한다.
   - 현재 위치 dot도 SVG circle로 렌더한다.
2. `style.css`
   - `.lz-running-map-bubble` 표시 폭을 Slice 1 대비 50%로 줄인다.
   - SVG tile/current marker 스타일을 새 렌더 방식에 맞춘다.
3. `tests/`, `sw.js`
   - 새 zoom/크기/타일 렌더 계약과 cache marker를 갱신한다.

### 검증 계획

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `node --test --test-reporter=dot tests/*.test.js`
5. `git diff --check`

## Slice 2 실행 결과

1. `home/life-zone.js`
   - `RUNNING_MAP_HOME_MAX_ZOOM`과 `RUNNING_MAP_SINGLE_POINT_ZOOM`을 `14`로 낮춰 짧은 route도 공원 단위 맥락이 보이게 했다.
   - VWorld tile을 HTML `img`가 아니라 SVG `<image>`로 렌더해 tile/path/start/current marker가 같은 viewBox에서 함께 축소되게 했다.
   - 현재 위치 dot을 CSS absolute span에서 SVG circle로 옮겼다.
2. `style.css`
   - `.lz-running-map-bubble` 폭을 `clamp(46px, calc(150 / 1672 * 100%), 68px)`로 줄여 Slice 1 대비 50% 크기로 낮췄다.
   - SVG tile/current marker 스타일을 정리하고, 쓰지 않는 tile layer 스타일을 제거했다.
3. `tests/`, `sw.js`
   - 홈 지도 테스트가 새 zoom, 절반 크기, SVG tile/current marker 계약을 확인하도록 갱신했다.
   - `CACHE_VERSION`을 `tomatofarm-v20260702z6-home-running-map-park-scale`로 bump했다.

## Slice 2 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/running-entry.test.js` - 23 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`
6. PASS: Dashboard3 Pages 배포 검증 - `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 0e9c5a93661ae24515486d38d2e1217e8d784b41` -> `[deploy-verify] ok 0e9c5a93661a tomatofarm-v20260702z6-home-running-map-park-scale static=236`
7. PASS: Dashboard3 Pages marker 검증 - `sw.js` cache version, `home/life-zone.js` zoom/SVG tile/current marker, `style.css` 절반 폭/current marker style 확인
8. not verified yet: 인증 계정 홈탭 실제 러닝 말풍선 UI flow 확인은 아직 남아 있다.
