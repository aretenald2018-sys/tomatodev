# 러닝 VWorld 기본 지도화 계획

## 상태

- 단계: implemented
- 요청: 러닝 화면에서 `실제 지도 키를 설정하면 GPS가 표시됩니다` 같은 개발자용 안내를 보여주지 말고, 이용자에게 바로 지도 위 GPS가 보이게 한다.
- 결정: 이번 변경은 `Slice 1. VWorld 공개키 기본 provider 적용`만 실행한다.

## 그릴 결과

### 핵심 질문 1. 사용자에게 키 설정을 요구할 것인가?

- 답변: 요구하지 않는다.
- 결정:
  - 제공된 VWorld key를 앱의 공개 지도 fallback key로 둔다.
  - `localStorage.cfg_vworld_api_key`가 있으면 그 값을 우선하고, 없으면 기본 VWorld key를 사용한다.
  - 이 key는 정적 프론트에서 호출되는 브라우저 지도 key라 사용자가 볼 수 있다. VWorld 콘솔에서 Dashboard3 도메인 제한을 걸어 관리한다.

### 핵심 질문 2. 기존 Google/TMAP 설정이 비어 있으면 어떻게 할 것인가?

- 답변: VWorld로 자동 fallback한다.
- 결정:
  - `auto`: VWorld -> TMAP -> Google -> none
  - `google` 또는 `tmap`이 강제돼 있어도 해당 key가 없고 VWorld key가 있으면 VWorld로 fallback한다.
  - `missing-key` 상태 문구에서는 `키`라는 단어를 제거한다.

### 핵심 질문 3. 실제 지도 위 GPS 표시는 어디까지 보장할 것인가?

- 답변: GPS 점/경로 렌더는 VWorld tile 위에서 바로 동작하게 한다.
- 결정:
  - 시작 전 위치 preview 1점이면 현재 위치 marker를 VWorld 지도 위에 표시한다.
  - 결과 요약 route가 있으면 VWorld 지도 위에 route polyline, 시작/종료 marker를 표시한다.
  - 실제 모바일 GPS 권한과 인증 flow는 배포 후 사용자 환경에서 확인한다.

## 구현 슬라이스

### Slice 1. VWorld 공개키 기본 provider 적용

- 상태: implemented
- 목표: 별도 사용자 설정 없이 러닝 지도 화면이 VWorld 실제 지도 위에 GPS/경로를 렌더한다.
- 예상 변경:
  - `config.js`: 기본 공개 VWorld key fallback 추가, 주석 정리
  - `workout/running-map.js`: Google/TMAP missing key 시 VWorld fallback, 개발자용 key 설정 문구 제거
  - `sw.js`: `CACHE_VERSION` bump
  - `tests/*`: 기본 provider, key fallback, user-facing 문구 제거, cache marker 검증
- 제외:
  - VWorld key를 비밀키처럼 숨기는 작업. 정적 앱 특성상 브라우저 지도 key는 공개된다.
  - 역지오코딩/공원명 자동 저장.
- 검증:
  - `node --check config.js; node --check workout/running-map.js; node --check sw.js`
  - `node --test tests/running-tracker.test.js tests/running-entry.test.js`
  - full test
  - `node scripts/verify-runtime-assets.mjs`
  - Dashboard3 Pages 배포 marker 검증

## 다음 세션 시작 기준

Slice 1 실행과 리뷰가 완료됐다. 후속으로 공원명/동네명 자동 저장이 필요하면 별도 계획에서 VWorld 역지오코딩 또는 공공 POI 조회를 다룬다.

## 실행 결과

- `config.js`: 제공된 VWorld browser map key를 기본 fallback으로 추가했다. `localStorage.cfg_vworld_api_key`가 있으면 기존처럼 우선한다.
- `workout/running-map.js`: `auto`/`none` 및 키 없는 `google`/`tmap` 설정이 VWorld로 fallback되게 했다.
- `workout/running-map.js`: 사용자 화면에서 `키를 설정하면...` 문구가 나오지 않도록 제거했다.
- `sw.js`: `CACHE_VERSION`을 `tomatofarm-v20260628z5-running-vworld-default-map`로 올렸다.
- `tests/*`: 기본 VWorld provider, fallback, 안내 문구 제거, cache marker 회귀 테스트를 갱신했다.

## 로컬 검증

- PASS: `node --check config.js; node --check workout/running-map.js; node --check sw.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js` — 12 tests passed
- PASS: `node --test tests/*.test.js` — 576 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --check`

## 배포 검증

- PASS: `npm.cmd run verify:deploy -- https://aretenald2018-sys.github.io/dashboard3/ 46d8984f612e0469d62963e7b2394548dcd4aa29`
  - 결과: `[deploy-verify] ok 46d8984f612e tomatofarm-v20260628z5-running-vworld-default-map static=221`
- PASS: `npm.cmd run verify:deployed-markers -- https://aretenald2018-sys.github.io/dashboard3/ ...`
  - `sw.js::tomatofarm-v20260628z5-running-vworld-default-map`
  - `config.js::PUBLIC_VWORLD_MAP_KEY`
  - `config.js::cfg_vworld_api_key') || PUBLIC_VWORLD_MAP_KEY`
  - `workout/running-map.js::if (provider === 'google' && !googleMapsKey && vworldApiKey) provider = 'vworld'`
  - `workout/running-map.js::if (provider === 'tmap' && !tmapAppKey && vworldApiKey) provider = 'vworld'`
  - `workout/running-map.js::지도를 불러오지 못했어요`
  - `workout/running-map.js::buildVworldTileUrl`
- PASS: 배포된 `workout/running-map.js`, `config.js`는 `키를 설정하면` 문구를 포함하지 않는다.
- PASS: VWorld tile sample URL이 `HTTP 200`, `image/png`로 응답한다.
