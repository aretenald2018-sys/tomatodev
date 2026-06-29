# 러닝 실제 지도 Provider 전환 계획

## 상태

- 단계: execution-complete
- 요청: 러닝 시작/결과 화면의 CSS/SVG 가짜 지도를 제거하고, Google Maps 또는 TMAP 같은 실제 지도 정보 위에 GPS 현재 위치와 경로를 표시한다.
- 결정: 이번 변경은 `Slice 1. 실제 지도 provider shell + Google/TMAP 렌더러 + fake map 제거`만 실행한다.

## 그릴 결과

### 핵심 질문 1. 가짜 지도 fallback을 유지할 것인가?

- 답변: 유지하지 않는다.
- 결정:
  - `style.css`의 fake road/grid background와 `buildRunningSessionRouteSvg()` 기반 미리보기는 제거한다.
  - 지도 key가 없으면 지도를 흉내 내지 않고 `실제 지도 키 필요` 상태를 보여준다.
  - 이 상태에서도 거리/시간/페이스/저장은 계속 동작한다.

### 핵심 질문 2. 어떤 provider를 먼저 연결할 것인가?

- 답변: Google Maps와 TMAP을 모두 optional provider로 둔다.
- 결정:
  - `localStorage.cfg_running_map_provider`: `auto`, `google`, `tmap`
  - `localStorage.cfg_google_maps_key`: Google Maps JavaScript API key
  - `localStorage.cfg_tmap_app_key`: TMAP JS V2 appKey
  - `auto`는 TMAP key가 있으면 TMAP, 없으면 Google key 순서로 선택한다.
  - key는 코드에 하드코딩하지 않는다. 기존 `config.js` 정책처럼 사용자/운영 환경에서 localStorage로 주입한다.

### 핵심 질문 3. GPS 표시는 어느 화면에 적용할 것인가?

- 답변: 시작 전 화면과 결과 요약 화면에 적용한다.
- 결정:
  - 시작 전: 실제 지도 타일 위에 현재 위치 marker를 표시한다. 위치 권한 전이면 서울 중심 기본 지도와 권한 대기 상태를 보여준다.
  - 결과 요약: 실제 지도 타일 위에 route polyline, 시작 marker, 종료 marker를 표시한다. route가 1점 이하이면 현재 위치 marker만 표시한다.
  - 진행 중 노란 화면은 첨부 화면 형태를 유지하고 지도를 넣지 않는다.

### 핵심 질문 4. 동네/공원명도 이번에 처리할 것인가?

- 답변: 이번 Slice에서는 처리하지 않는다.
- 결정:
  - 이번 요청의 핵심은 “가짜 지도 제거 + 실제 지도 위 GPS 표기”다.
  - 동네/공원명 자동 요약은 Google Geocoding/Places, TMAP POI/Reverse Geocoding 또는 Kakao/Naver Local API 연결이 필요하므로 다음 Slice로 분리한다.
  - 임의로 `무슨 공원` 같은 텍스트를 만들어 저장하지 않는다.

## 공식 문서 확인

- Google Maps JavaScript API는 API key가 필수이며, dynamic import/direct script 방식으로 로드할 수 있다.
  - https://developers.google.com/maps/documentation/javascript/load-maps-js-api
  - https://developers.google.com/maps/documentation/javascript/get-api-key
- TMAP JS V2 문서에는 `Tmapv2.Map`, `Tmapv2.Marker`, `Tmapv2.Polyline`, `Tmapv2.LatLngBounds`가 제공된다.
  - https://tmapapi.tmapmobility.com/main.html

## 구현 슬라이스

### Slice 1. 실제 지도 provider shell + Google/TMAP 렌더러 + fake map 제거

- 상태: completed
- 목표: 러닝 시작/결과 화면에서 가짜 지도 대신 실제 지도 SDK container를 렌더하고, provider key가 있으면 GPS marker/polyline을 지도 위에 표시한다.
- 예상 변경:
  - `config.js`: 러닝 지도 provider/key getter 추가
  - `workout/running-map.js`: Google/TMAP SDK lazy loader, map 생성, marker/polyline 렌더러, key 없음/로드 실패 상태
  - `workout/running-session.js`: fake SVG map 제거, 실제 지도 shell 렌더, 시작 화면 위치 preview 요청, render 후 map mount
  - `style.css`: fake road/SVG 스타일 제거, 실제 지도 canvas/status/badge 스타일 추가
  - `sw.js`: `workout/running-map.js` 추가 및 `CACHE_VERSION` bump
  - `tests/*`: fake map 제거와 real provider marker 검증
- 제외:
  - 동네/공원명 역지오코딩
  - Google/TMAP key 발급/Cloud Console 설정 자동화
  - 백그라운드 GPS tracking
- 검증:
  - `node --check workout/running-map.js workout/running-session.js config.js sw.js`
  - `node --test tests/running-tracker.test.js tests/running-entry.test.js`
  - full test
  - `node scripts/verify-runtime-assets.mjs`
  - 배포 marker: `workout/running-map.js`, `cfg_google_maps_key`, `cfg_tmap_app_key`, fake SVG marker 제거

#### 구현 결과

- `config.js`: `cfg_running_map_provider`, `cfg_google_maps_key`, `cfg_tmap_app_key` getter를 추가했다.
- `workout/running-map.js`: Google Maps/TMAP SDK lazy loader, marker/polyline 렌더러, key 없음/로드 실패 상태를 추가했다.
- `workout/running-session.js`: `buildRunningSessionRouteSvg()`와 fake SVG route preview를 제거하고, 시작/요약 화면을 실제 지도 shell mount 방식으로 교체했다.
- `style.css`: fake road/grid background와 SVG route 스타일을 제거하고 실제 지도 canvas/status/label 스타일을 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z1-running-real-map`으로 bump하고 `./workout/running-map.js`를 `STATIC_ASSETS`에 추가했다.
- 테스트: fake map 제거, Google/TMAP provider config, service worker marker를 검증하도록 갱신했다.

#### 실행 검증

- PASS: `node --check config.js; node --check workout/running-map.js; node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js` — 12 tests passed.
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 570 tests passed.
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`.
- PASS: `git diff --cached --check; git diff --check`.

## 다음 세션 시작 기준

Slice 1 실행이 완료되었다. 다음 세션은 리뷰로 시작한다. 실제 지도 타일 표시 검증은 Google Maps key 또는 TMAP appKey가 설정된 브라우저에서만 완료할 수 있다. key가 없는 배포 검증에서는 `실제 지도 키 필요` 상태와 fake map 제거만 확인한다.
