# 러닝 지도 VWorld Provider 연결 계획

## 상태

- 단계: implemented
- 요청: 비용이 들지 않는 한국 지도 옵션으로 VWorld API key를 제공했으므로, 러닝 시작/결과 지도에서 실제 지도 타일 위에 GPS 위치와 경로를 표시한다.
- 결정: 이번 변경은 `Slice 1. VWorld WMTS provider 추가`만 실행한다.

## 그릴 결과

### 핵심 질문 1. 제공된 VWorld key를 코드에 직접 저장할 것인가?

- 답변: 직접 저장하지 않는다.
- 이유:
  - `config.js`가 이미 “API 키는 코드에 저장하지 않고 localStorage에서 로드”하는 패턴을 갖고 있다.
  - GitHub Pages 정적 앱에 key를 커밋하면 누구나 볼 수 있다.
- 결정:
  - `localStorage.cfg_vworld_api_key`를 새 설정 키로 추가한다.
  - 사용자는 배포 사이트에서 localStorage에 VWorld key를 설정한다.
  - provider는 `localStorage.cfg_running_map_provider = "vworld"` 또는 `auto`에서 VWorld key가 있으면 자동 선택한다.

### 핵심 질문 2. VWorld SDK를 쓸 것인가, WMTS tile을 직접 렌더할 것인가?

- 답변: WMTS/XYZ tile을 직접 렌더한다.
- 이유:
  - 현재 `workout/running-map.js`는 provider별 renderer를 갖는 얇은 구조다.
  - VWorld tile URL은 `Base`, `Satellite`, `Hybrid` 계열 tile을 직접 요청할 수 있어 SDK 의존 없이 지도 배경을 구성할 수 있다.
  - 러닝 화면은 pan/zoom보다 “현재 위치/경로가 실제 지도 위에 보이는 것”이 우선이다.
- 결정:
  - Web Mercator tile 계산으로 canvas 내부에 tile grid를 배치한다.
  - route polyline, 시작/종료 marker, 현재 위치 marker는 DOM/SVG overlay로 렌더한다.
  - 기본 layer는 `base`, 선택 layer는 `satellite`, `hybrid`를 허용한다.

### 핵심 질문 3. 기존 Google/TMAP provider와의 우선순위는 어떻게 할 것인가?

- 답변: `auto`에서 VWorld를 최우선으로 둔다.
- 결정:
  - `auto`: VWorld key → TMAP key → Google key → none
  - 기존 `google`, `tmap` provider는 유지한다.
  - `vworld` provider 명시 선택도 지원한다.

## 구현 슬라이스

### Slice 1. VWorld WMTS provider 추가

- 상태: implemented
- 목표: 러닝 지도 provider에 VWorld를 추가하고, VWorld key가 있을 때 실제 한국 지도 타일 위에 GPS route를 렌더한다.
- 예상 변경:
  - `config.js`: `cfg_vworld_api_key`, `cfg_vworld_map_layer` getter 추가
  - `workout/running-map.js`: VWorld config resolution, tile URL builder, DOM tile renderer, route overlay 추가
  - `style.css`: VWorld tile/route overlay 스타일 추가
  - `sw.js`: `CACHE_VERSION` bump
  - `tests/*`: VWorld provider config, tile URL, cache marker 테스트 추가/갱신
- 제외:
  - VWorld key 원문을 repo에 커밋하지 않는다.
  - 역지오코딩으로 동네/공원명을 자동 저장하는 기능은 별도 slice로 둔다.
  - 실제 GPS 권한이 필요한 브라우저 주행 테스트는 인증/모바일 환경에서 확인한다.
- 검증:
  - `node --check config.js; node --check workout/running-map.js; node --check sw.js`
  - `node --test tests/running-tracker.test.js tests/running-entry.test.js`
  - full test
  - `node scripts/verify-runtime-assets.mjs`
  - Dashboard3 Pages 배포 marker 검증

## 다음 세션 시작 기준

Slice 1 구현과 리뷰는 완료했다. VWorld key는 localStorage에 설정해야 배포 UI에서 실제 tile 로드까지 확인할 수 있다.

## 실행 결과

- `config.js`: `cfg_vworld_api_key`, `cfg_vworld_map_layer` localStorage getter를 추가했다.
- `workout/running-map.js`: `vworld` provider resolution, `buildVworldTileUrl()`, VWorld WMTS tile renderer, route SVG overlay, 시작/종료 marker, `VWorld` attribution을 추가했다.
- `style.css`: VWorld tile layer, route line, marker, attribution 스타일을 추가했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z4-running-vworld-map`으로 갱신했다.
- `tests/running-tracker.test.js`, `tests/running-entry.test.js`: VWorld provider 우선순위, tile URL, config marker, cache marker를 검증한다.
- 보안/배포 결정: 제공된 VWorld key 원문은 repo에 커밋하지 않았다. 배포 브라우저에서 localStorage로 설정한다.

## 실행 검증

- PASS: `node --check config.js; node --check workout/running-map.js; node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js` — 12 tests passed
- PASS: `node --test @tests` — 576 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`
- PASS: VWorld Base tile HEAD with provided key and Dashboard3 referer — `HTTP/1.1 200`, `Content-Type: image/png`
- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 74040ed` — deployed `74040ed54c4d`, `tomatofarm-v20260628z4-running-vworld-map`, `static=221`
- PASS: deployed markers — `cfg_vworld_api_key`, `cfg_vworld_map_layer`, `buildVworldTileUrl`, `api.vworld.kr/req/wmts/1.0.0`, `wt-vworld-map`, `wt-vworld-route-layer`, `.wt-vworld-tile`, `.wt-vworld-route-line`
- PASS: deployed key check — provided key 원문이 `config.js`, `workout/running-map.js`에 없음
- PASS: `curl.exe -I https://aretenald2018-sys.github.io/dashboard3/` — `HTTP/1.1 200 OK`
