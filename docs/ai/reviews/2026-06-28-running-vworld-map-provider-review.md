# 러닝 지도 VWorld Provider 리뷰

## 범위

- 계획: `docs/ai/features/2026-06-28-running-vworld-map-provider.md`
- Slice: `VWorld WMTS provider 추가`

## 리뷰 결과

- Blocking issue 없음.
- `auto` provider 우선순위는 VWorld key, TMAP key, Google key, none 순서로 정리됐다.
- VWorld key는 repo에 직접 저장하지 않고 `localStorage.cfg_vworld_api_key`로만 읽는다. 정적 GitHub Pages 앱에서 key 원문이 commit history에 남지 않는 쪽이 맞다.
- VWorld는 SDK 없이 WMTS tile을 직접 렌더한다. 시작/요약 화면의 기존 실제 지도 shell을 유지하면서 tile layer 위에 route polyline과 시작/종료 marker를 올린다.
- `base`, `satellite`, `hybrid` layer를 지원한다. `hybrid`는 Satellite tile 위에 Hybrid overlay를 겹치는 방식이다.
- 기존 Google/TMAP provider와 fake map 제거 계약은 유지됐다.
- `config.js`, `workout/running-map.js`, `style.css`가 `STATIC_ASSETS` 대상이므로 `sw.js` cache marker bump와 테스트 갱신이 포함됐다.

## 검증

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

## 남은 확인

- not verified yet: 배포 UI에서 localStorage key 설정 후 러닝 시작/결과 화면의 실제 tile/route 시각 확인은 인증 계정 또는 모바일 GPS 환경에서 확인해야 한다.
