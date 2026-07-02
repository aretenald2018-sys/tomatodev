# 홈 러닝 지도 말풍선 신뢰성 개선 리뷰

- 계획 문서: `docs/ai/features/2026-07-02-home-running-map-bubble-reliability.md`
- 리뷰일: `2026-07-02`
- 결과: 문제 없음

## 리뷰 결과

1. `home/life-zone.js`
   - `_buildRunningMapBubbleData()`는 기존 `waiting`/`missing-map`/`ready` 분기를 유지하면서 진단 메타만 추가한다.
   - `ready` 분기에서 VWorld tile 계산, route polyline 계산, 현재 위치 dot 계산은 유지된다.
   - `_bindRunningMapTileDiagnostics()`는 말풍선 DOM append 직전에 tile load/error listener를 붙이며, 이미 complete 상태인 이미지도 `naturalWidth`로 즉시 판정한다.
   - 모든 tile이 실패한 경우에만 `is-tile-failed`가 붙어, 일부 tile이 정상 로드된 지도까지 실패 UI로 덮지 않는다.
2. `style.css`
   - fallback 배경은 `waiting`, `missing-map`, `is-tile-failed`에만 적용된다.
   - 정상 `ready` 상태에서는 기존 tile/path/dot 스타일을 유지하고, tile-failed fallback 텍스트는 숨겨진 상태로 남는다.
3. `sw.js`
   - `home/life-zone.js`, `style.css` 변경에 맞춰 `CACHE_VERSION`이 `tomatofarm-v20260702z3-home-running-map-bubble`로 갱신됐다.
4. 테스트
   - 홈 러닝 지도 marker 테스트에 진단 `data-*`, tile load/error handler, fallback CSS marker가 추가됐다.
   - 전체 테스트에서 cache version marker 일괄 갱신이 통과했다.

## 검증

1. PASS: `node --check home/life-zone.js; node --check sw.js`
2. PASS: `node --test tests/home-life-zone-npc-quest.test.js tests/home-life-zone-state.test.js tests/running-entry.test.js` - 43 tests passed
3. PASS: `node scripts/verify-runtime-assets.mjs` - `[runtime-assets] ok refs=862`
4. PASS: `node --test --test-reporter=dot tests/*.test.js`
5. PASS: `git diff --check`

## 남은 확인

- not verified yet: Dashboard3 Pages 배포 검증과 인증 계정 실제 flow `운동 탭 -> 러닝 시작 -> 홈 탭 -> 라이프존 러닝 지도 말풍선` 확인은 아직 수행하지 않았다.
