# 홈 러닝 지도 말풍선 신뢰성 개선 계획

## 상태

- 상태: `executed`
- 작성일: `2026-07-02`
- 자동 트리거: `/diagnose`

## 요청 요약

홈 화면 라이프존에서 러닝 중 지도 말풍선이 실제 지도 타일/경로 없이 작은 점 하나처럼 보이는 문제를 개선한다. 단순 추측 수정이 아니라, 실제 코드상 `missing-map`, `waiting`, `ready-but-one-point`, `ready-but-tile-load-failed` 상태를 구분할 수 있게 만들고, 사용자가 보는 UI도 점 하나만 남지 않도록 보정한다.

## /diagnose

### 재현/피드백 루프

1. 정적 fixture 성격의 테스트로 `home/life-zone.js`의 홈 지도 말풍선 렌더 계약을 확인한다.
2. `_buildRunningMapBubbleData()`가 VWorld 설정 정상일 때 `state: 'ready'`, `tiles.length > 0`, 2점 이상 route에서 `path`를 반환하는지 검증한다.
3. VWorld 설정이 없거나 타일 이미지 로드가 실패한 상태에서도 화면이 점 하나만 남지 않는 fallback을 검증한다.
4. 변경 파일이 `STATIC_ASSETS`에 포함되면 `sw.js` `CACHE_VERSION`을 함께 갱신한다.

### 확인된 사실

1. 실제 `home/life-zone.js`에는 `tiles`, `path`, `dot` 계산 코드가 존재한다. 이전 대화의 주석형 스니펫은 요약 때문에 생략된 것이다.
2. 로컬 기본 config 기준 `readRunningMapConfig()`는 `provider: "vworld"`, `configured: true`를 반환한다.
3. 기본 VWorld 타일 URL은 HEAD 요청에서 `200 image/png`를 반환했다.
4. 따라서 "점만 보임"은 `missing-map`만으로 단정하기 어렵고, `ready` 상태에서 타일 이미지가 브라우저에서 실패하거나 route가 1점뿐이라 `path`가 없는 상태도 같이 고려해야 한다.

### 가설

1. 브라우저 localStorage의 `cfg_vworld_api_key`가 잘못된 값으로 덮여 있어 타일 요청이 실패한다.
2. 말풍선이 `state: ready`지만 route가 1점뿐이라 `path`가 비어 있고, 타일 이미지도 로드되지 않아 점만 남는다.
3. 타일 `<img>`에 로드 실패 상태를 반영하는 로직이 없어 브라우저에서 이미지가 실패해도 사용자와 개발자가 원인을 구분하기 어렵다.
4. `missing-map`/`waiting` fallback UI가 너무 작아 점만 남은 것처럼 보인다.

## Slice 1. 홈 러닝 지도 말풍선 fallback 및 진단 상태 개선

### 포함 범위

1. `home/life-zone.js`
   - `_buildRunningMapBubbleData()` 반환값에 `provider`, `configured`, `reason`, `tileCount`, `pointCount`, `hasPath` 같은 진단 메타를 추가한다.
   - `_renderRunningMapBubble()`이 진단 메타를 `data-*` 속성으로 노출하게 한다.
   - 타일 이미지에 `error`/`load` 이벤트를 붙여 모든 타일 실패 시 `is-tile-failed` 상태를 말풍선에 반영한다.
   - `waiting`/`missing-map`/`tile-failed` 상태에서 점 하나만 보이지 않도록 fallback 텍스트 또는 미니 지도 placeholder를 명확히 표시한다.
2. `style.css`
   - `.lz-running-map-bubble--missing-map`, `.lz-running-map-bubble--waiting`, `.lz-running-map-bubble.is-tile-failed`의 fallback UI를 보강한다.
   - 정상 `ready` 상태의 타일/경로/현재점 스타일은 유지한다.
3. `tests/home-life-zone-npc-quest.test.js` 또는 관련 홈 라이프존 테스트
   - 진단 `data-*` 속성, 타일 error handler, fallback class가 다시 빠지지 않도록 회귀 테스트를 추가/수정한다.
4. `sw.js`
   - `home/life-zone.js`, `style.css`가 `STATIC_ASSETS`에 포함되어 있으므로 `CACHE_VERSION`을 bump한다.

### 제외 범위

- 러닝 GPS 수집 로직 변경
- 러닝 기록 저장 schema 변경
- 운동 상세 카드의 `renderRunningMap()` 변경
- 지도 provider를 Google/TMAP으로 바꾸는 작업
- 새 지도 SDK 도입
- 홈 전체 `renderHome()`를 부분 업데이트로 바꾸는 성능 리팩터

## 검증

1. `node --check home/life-zone.js; node --check sw.js`
2. `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js`
3. `node scripts/verify-runtime-assets.mjs`
4. `git diff --check`
5. Dashboard3 Pages 배포 후 `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ <commit>`
6. 배포 marker 검증: `sw.js` cache version, `home/life-zone.js` 지도 진단 `data-*`/tile error handler, `style.css` fallback class
7. 인증 세션이 있으면 실제 flow: `운동 탭 -> 러닝 시작 -> 홈 탭 -> 라이프존 러닝 지도 말풍선`에서 타일/경로/현재점 또는 명확한 fallback 상태를 확인한다.

## 다음 실행 시작 프롬프트

`docs/ai/features/2026-07-02-home-running-map-bubble-reliability.md`의 Slice 1을 실행한다. 홈 라이프존 러닝 지도 말풍선이 타일 로드 실패나 설정 문제에서 작은 점 하나만 남지 않도록 fallback과 진단 상태를 추가하고, 관련 테스트 및 `sw.js` cache version을 갱신한다.

## Slice 1 실행 결과

1. `home/life-zone.js`
   - `_buildRunningMapBubbleData()` 반환값에 `provider`, `configured`, `reason`, `tileCount`, `pointCount`, `hasPath` 메타를 추가했다.
   - `_renderRunningMapBubble()`가 해당 메타를 `data-lz-running-map-*` 속성으로 노출한다.
   - ready 상태 타일 이미지에 `load`/`error` 이벤트 진단을 붙여 전체 타일 실패 시 `is-tile-failed` class와 `data-lz-running-map-tile-state="failed"`를 남긴다.
   - ready 상태에도 tile-failed 전용 fallback 텍스트를 숨겨 두고, 실패 시에만 표시한다.
2. `style.css`
   - `waiting`, `missing-map`, `is-tile-failed` 상태에서 미니 지도 placeholder 배경을 표시하도록 보강했다.
   - tile-failed 상태에서 숨겨진 fallback 텍스트가 보이도록 했다.
3. `tests/home-life-zone-npc-quest.test.js`
   - 지도 진단 `data-*`, tile load/error handler, tile-failed fallback CSS marker 테스트를 추가했다.
4. `sw.js`
   - `CACHE_VERSION`을 `tomatofarm-v20260702z3-home-running-map-bubble`로 bump했다.
   - 기존 cache marker 테스트들을 새 버전에 맞췄다.

## Slice 1 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js` - 43 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`
6. not verified yet: Dashboard3 Pages 배포/인증 계정 실제 홈탭 러닝 지도 말풍선 UI flow 확인은 아직 수행하지 않았다.
