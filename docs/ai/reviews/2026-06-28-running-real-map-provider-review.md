# 러닝 실제 지도 Provider 전환 리뷰

## 리뷰 대상

- 계획: `docs/ai/features/2026-06-28-running-real-map-provider.md`
- Slice: Slice 1 — 실제 지도 provider shell + Google/TMAP 렌더러 + fake map 제거
- 변경 파일:
  - `config.js`
  - `workout/running-map.js`
  - `workout/running-session.js`
  - `style.css`
  - `sw.js`
  - `tests/running-entry.test.js`
  - `tests/running-tracker.test.js`
  - cache version 참조 테스트들

## Findings

- 발견된 차단 이슈 없음.

## 확인한 계약

- 시작/결과 화면에서 CSS road/grid background와 `wt-running-session-route-svg` 기반 fake map preview를 제거했다.
- `workout/running-map.js`는 `cfg_running_map_provider`, `cfg_google_maps_key`, `cfg_tmap_app_key`를 기반으로 Google Maps 또는 TMAP을 lazy load한다.
- provider key가 있으면 실제 지도 canvas에 현재 위치 marker, route polyline, 시작/종료 marker를 렌더한다.
- provider key가 없거나 SDK 로드가 실패하면 가짜 지도를 그리지 않고 상태 메시지만 표시한다.
- `workout/running-map.js`가 `STATIC_ASSETS`에 추가되어 `sw.js` `CACHE_VERSION`을 함께 bump했다.

## 검증

- PASS: `node --check config.js; node --check workout/running-map.js; node --check workout/running-session.js; node --check sw.js`
- PASS: `node --test tests/running-tracker.test.js tests/running-entry.test.js` — 12 tests passed
- PASS: `$tests = rg --files tests | Where-Object { $_ -match '\.test\.js$' }; node --test @tests` — 570 tests passed
- PASS: `node scripts/verify-runtime-assets.mjs` — `[runtime-assets] ok refs=846`
- PASS: `git diff --cached --check; git diff --check`

## 남은 범위

- not verified yet: Google Maps key 또는 TMAP appKey가 설정된 브라우저가 없어 실제 지도 타일 로드와 provider SDK marker/polyline 렌더는 배포 후 key 설정 환경에서 확인해야 한다.
- 동네/공원명 자동 요약은 다음 Slice에서 Google/TMAP/Kakao/Naver 역지오코딩 또는 POI API를 별도로 연결해야 한다.
