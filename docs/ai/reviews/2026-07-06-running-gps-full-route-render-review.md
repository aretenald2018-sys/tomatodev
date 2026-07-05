# 2026-07-06 Running GPS Full Route Render Review

## 리뷰 범위

- 계획: `docs/ai/features/2026-07-06-running-gps-full-route-render.md`
- 요청: 러닝 GPS 지도가 시작점과 끝점만 직선으로 연결하지 않고, 폰이 수집한 전체 이동경로를 렌더링한다.
- 실행 슬라이스: Slice 1, 공유 러닝 지도 route point normalization 보정.

## 변경 파일

- `workout/running-map.js`
- `tests/running-tracker.test.js`
- `sw.js`
- `tests/*.test.js` cache marker expectations
- `docs/ai/NEXT_ACTION.md`
- `docs/ai/features/2026-07-06-running-gps-full-route-render.md`

## 결과

- 상태: `complete`
- 판정: PASS

## 주요 확인

1. `normalizeRunningMapPoints()`가 `lat/lng`, `latitude/longitude`, `latitude/lon` 샘플을 유효 route point로 유지한다.
2. `null`, `undefined`, 빈 문자열, `Infinity` 좌표는 route에서 제외된다.
3. VWorld 렌더링 표면에서 `data-map-point-count=4`, `.wt-vworld-route-line` point count `4`를 확인했다.
4. Google provider 경계에서는 polyline path/marker/bounds가 `lat/lng`만 받도록 보강했다.
5. `workout/running-map.js`가 `STATIC_ASSETS`에 있으므로 `sw.js` `CACHE_VERSION`을 `tomatofarm-v20260706z1-running-gps-full-route`로 갱신했다.

## 검증

- PASS: `node --test tests/running-tracker.test.js`
- PASS: `npm.cmd run verify:assets`
- PASS: `node --test tests/*.test.js`
- PASS: `.omo/evidence/gps-full-route-20260706/route-map-browser-qa.json`
- PASS: `.omo/evidence/gps-full-route-20260706/google-provider-route-sanitized.json`
- PASS: production Pages `verify:deploy` - cache `tomatofarm-v20260706z1-running-gps-full-route`
- PASS: production UI flow - Pages URL HTTP 200, deployed `workout/running-map.js` import, route point count `4`, polyline point count `4`

## 리뷰 메모

- QA lane: PASS, short-lived browser harness로 전체 polyline point count 확인.
- Code quality lane: PASS, blocking issue 없음.
- Security lane: PASS 후 MEDIUM privacy note를 반영해 외부 provider 전달 route를 좌표 전용으로 제한.
- Gate/context lane: 최초 FAIL 사유는 stale `NEXT_ACTION`, review doc 누락, ULW 상태/production verification pending이었다. 문서 상태, provider 보강, commit/push, production verification을 반영했다.
